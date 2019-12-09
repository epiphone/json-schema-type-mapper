import { JSONSchema } from 'json-schema-typed'

// Helpers:

/**
 * Force TS to load a type that has not been computed
 * https://github.com/pirix-gh/ts-toolbelt
 */
export type Compute<A extends any> = A extends Function
  ? A
  : { [K in keyof A]: A[K] } & {}

/**
 * Courtesy of @jcalz at https://stackoverflow.com/a/50375286/1763012
 */
type UnionToIntersection<U> = (U extends any
? (k: U) => void
: never) extends (k: infer I) => void
  ? I
  : never

/*
 * Define and use JSON types in favor of `any`:
 */

export interface JSONObject {
  [key: string]: JSONValue
}

export interface JSONArray extends Array<JSONValue> {}

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONObject
  | JSONArray

/*
 * Group `definitions` sub-schemas by their `$id` property:
 */

type Definitions = Record<string, JSONSchema>

interface JSONSchemaDefinitions extends JSONSchema {
  definitions: Record<string, JSONSchema>
}

export type DefinitionIds<S extends JSONSchemaDefinitions> = Exclude<
  S['definitions'][keyof S['definitions']]['$id'],
  undefined
>

export type DefinitionsById<S> = S extends JSONSchemaDefinitions
  ? {
      [Id in DefinitionIds<S>]: {
        [P in keyof S['definitions']]: S['definitions'][P]['$id'] extends Id
          ? S['definitions'][P]
          : never
      }[keyof S['definitions']]
    }
  : {}

/**
 * Root schema
 *
 * `Schema` cannot refer to itself recursively so we use an intermediate
 * `Resolve` type and finite recursion.
 */

export type Schema<
  S extends JSONSchema | boolean | undefined,
  D = DefinitionsById<S>,
  R = Resolve<S, D>
> = R extends ['recur', infer T]
  ? S1<T, D>
  : R extends ['allOf', infer T]
  ? Compute<UnionToIntersection<S1<T, D>>>
  : R

// If a single `allOf` item contains `additionalProperties: false`, none of the
// other items are allowed additional properties either:
type OverrideAdditionalProperties<T> = Extract<
  T,
  { additionalProperties: false }
> extends never
  ? T
  : T & { additionalProperties: false }

export type Resolve<
  S extends JSONSchema | boolean | undefined,
  D
> = S extends false
  ? never
  : S extends JSONSchemaRef
  ? ['recur', RefObject<S, D>]
  : S extends { anyOf: Array<infer AnyOf> }
  ? ['recur', AnyOf]
  : S extends { allOf: Array<infer AllOf> }
  ? ['allOf', OverrideAdditionalProperties<AllOf>]
  : S extends JSONSchemaNot
  ? NotObject<S>
  : S extends JSONSchemaConst
  ? ConstObject<S>
  : S extends JSONSchemaEnum
  ? EnumObject<S>
  : S extends JSONSchemaPrimitive
  ? PrimitiveObject<S>
  : S extends JSONSchemaArray
  ? ArrayObject<S, D>
  : S extends JSONSchemaObject
  ? PropertiesObject<S, D>
  : S extends { type: 'object' } // Handle empty objects: `{ "type": "object" }`
  ? PropertiesObject<S & { properties: {} }, D>
  : JSONValue // `Schema<true | undefined | {}>` resolves to any valid JSON value

/**
 * Primitive types, e.g. `{ "type": "string" }` and `{ "type": ["null", "number"] }`:
 */

type PrimitiveNumber = 'integer' | 'number' // number types are handled identically
type PrimitiveType = 'string' | 'boolean' | 'null' | PrimitiveNumber

interface JSONSchemaPrimitive extends JSONSchema {
  type: PrimitiveType | PrimitiveType[]
}

export type PrimitiveObject<S extends JSONSchemaPrimitive> = S extends {
  type: 'string'
}
  ? string
  : S extends { type: PrimitiveNumber }
  ? number
  : S extends { type: 'boolean' }
  ? boolean
  : S extends { type: 'null' }
  ? null
  : S extends { type: Array<infer Types> } // Handle array of types, e.g. { "type": ["string", "number"] }
  ? Types extends PrimitiveType
    ? { [Type in Types]: PrimitiveObject<{ type: Type }> }[Types]
    : never
  : never

/**
 * Negation type e.g. `{ "not": { "type": "integer" } }`:
 *
 * `not` is only supported in case of primitives.
 */

interface JSONSchemaNot extends JSONSchema {
  not: JSONSchemaPrimitive
}

// Excluding "integer" also excludes "number" and vice versa since number types
// are handled identically in Typescript:
type ExcludePrimitive<T> = Exclude<
  PrimitiveType,
  T extends PrimitiveNumber ? T | PrimitiveNumber : T
>

export type NotObject<S extends JSONSchemaNot> = S extends {
  not: { type: Array<infer Not> | infer Not }
}
  ? PrimitiveObject<
      S & {
        type: Array<ExcludePrimitive<Not>>
      }
    >
  : never

/**
 * Enumerables, e.g. `{ "type": "string", "enum": ["some", "other"] }`:
 */

type JSONSchemaEnum = JSONSchema & { enum: JSONValue[] }

export type EnumObject<S extends JSONSchemaEnum> = S extends {
  enum: Array<infer Enum>
}
  ? S extends JSONSchemaPrimitive
    ? Enum & PrimitiveObject<S>
    : Enum // "type" takes precedence over "enum"
  : never

/**
 * Constants, e.g. `{ "const": 12 }`:
 *
 * The above is just syntactic sugar for `{ "enum": [12] }`.
 */

type JSONSchemaConst = JSONSchema & { const: JSONValue }

export type ConstObject<S extends JSONSchemaConst> = S extends {
  const: infer Const
}
  ? EnumObject<S & { enum: [Const] }>
  : never

/**
 * Array schemas:
 */

interface JSONSchemaArray extends JSONSchema {
  type: 'array'
}

export type ArrayObject<
  S extends JSONSchemaArray,
  D
> = S['items'] extends JSONSchema
  ? Schema<S['items'], D>[]
  : S extends JSONSchemaTuple
  ? TupleObject<S, D>
  : JSONValue[] // when `items` is undefined, allow an array of any JSON values

interface JSONSchemaTuple extends JSONSchema {
  type: 'array'
  items: (JSONSchema | boolean)[]
}

// The ugly part - tuple schemas for now work up to a maximum of 6 hardcoded items:

export type TupleObject<
  S extends JSONSchemaTuple,
  D
> = S['additionalItems'] extends false
  ? TupleNoAdditionalObject<S, D>
  : TupleWithAdditionalObject<S, D>

type TupleNoAdditionalObject<
  S extends JSONSchemaTuple,
  D
> = S['items'] extends [infer S1]
  ? [] | [Schema<S1, D>]
  : S['items'] extends [infer S1, infer S2]
  ? [] | [Schema<S1, D>] | [Schema<S1, D>, Schema<S2, D>]
  : S['items'] extends [infer S1, infer S2, infer S3]
  ?
      | []
      | [Schema<S1, D>]
      | [Schema<S1, D>, Schema<S2, D>]
      | [Schema<S1, D>, Schema<S2, D>, Schema<S3, D>]
  : S['items'] extends [infer S1, infer S2, infer S3, infer S4]
  ?
      | []
      | [Schema<S1, D>]
      | [Schema<S1, D>, Schema<S2, D>]
      | [Schema<S1, D>, Schema<S2, D>, Schema<S3, D>]
      | [Schema<S1, D>, Schema<S2, D>, Schema<S3, D>, Schema<S4, D>]
  : S['items'] extends [infer S1, infer S2, infer S3, infer S4, infer S5]
  ?
      | []
      | [Schema<S1, D>]
      | [Schema<S1, D>, Schema<S2, D>]
      | [Schema<S1, D>, Schema<S2, D>, Schema<S3, D>]
      | [Schema<S1, D>, Schema<S2, D>, Schema<S3, D>, Schema<S4, D>]
      | [
          Schema<S1, D>,
          Schema<S2, D>,
          Schema<S3, D>,
          Schema<S4, D>,
          Schema<S5, D>
        ]
  : S['items'] extends [
      infer S1,
      infer S2,
      infer S3,
      infer S4,
      infer S5,
      infer S6
    ]
  ?
      | []
      | [Schema<S1, D>]
      | [Schema<S1, D>, Schema<S2, D>]
      | [Schema<S1, D>, Schema<S2, D>, Schema<S3, D>]
      | [Schema<S1, D>, Schema<S2, D>, Schema<S3, D>, Schema<S4, D>]
      | [
          Schema<S1, D>,
          Schema<S2, D>,
          Schema<S3, D>,
          Schema<S4, D>,
          Schema<S5, D>
        ]
      | [
          Schema<S1, D>,
          Schema<S2, D>,
          Schema<S3, D>,
          Schema<S4, D>,
          Schema<S5, D>,
          Schema<S6, D>
        ]
  : never

type TupleWithAdditionalObject<
  S extends JSONSchemaTuple,
  D
> = S['items'] extends [infer S1]
  ? [] | [Schema<S1, D>, ...Schema<S['additionalItems'], D>[]]
  : S['items'] extends [infer S1, infer S2]
  ?
      | []
      | [Schema<S1, D>]
      | [Schema<S1, D>, Schema<S2, D>, ...Schema<S['additionalItems'], D>[]]
  : S['items'] extends [infer S1, infer S2, infer S3]
  ?
      | []
      | [Schema<S1, D>]
      | [Schema<S1, D>, Schema<S2>]
      | [
          Schema<S1, D>,
          Schema<S2, D>,
          Schema<S3, D>,
          ...Schema<S['additionalItems'], D>[]
        ]
  : S['items'] extends [infer S1, infer S2, infer S3, infer S4]
  ?
      | []
      | [Schema<S1, D>]
      | [Schema<S1, D>, Schema<S2>]
      | [Schema<S1, D>, Schema<S2, D>, Schema<S3>]
      | [
          Schema<S1, D>,
          Schema<S2, D>,
          Schema<S3, D>,
          Schema<S4, D>,
          ...Schema<S['additionalItems'], D>[]
        ]
  : S['items'] extends [infer S1, infer S2, infer S3, infer S4, infer S5]
  ?
      | []
      | [Schema<S1, D>]
      | [Schema<S1, D>, Schema<S2>]
      | [Schema<S1, D>, Schema<S2, D>, Schema<S3, D>, Schema<S4>]
      | [
          Schema<S1, D>,
          Schema<S2, D>,
          Schema<S3, D>,
          Schema<S4, D>,
          Schema<S5, D>,
          ...Schema<S['additionalItems'], D>[]
        ]
  : S['items'] extends [
      infer S1,
      infer S2,
      infer S3,
      infer S4,
      infer S5,
      infer S6
    ]
  ?
      | []
      | [Schema<S1, D>]
      | [Schema<S1, D>, Schema<S2>]
      | [Schema<S1, D>, Schema<S2, D>, Schema<S3>]
      | [Schema<S1, D>, Schema<S2, D>, Schema<S3, D>, Schema<S4>]
      | [Schema<S1, D>, Schema<S2, D>, Schema<S3, D>, Schema<S4, D>, Schema<S5>]
      | [
          Schema<S1, D>,
          Schema<S2, D>,
          Schema<S3, D>,
          Schema<S4, D>,
          Schema<S5, D>,
          Schema<S6, D>,
          ...Schema<S['additionalItems'], D>[]
        ]
  : never

/**
 * Objects such as `{ "type": "object", "properties": { "x": { "type": "string" }}}`:
 */

interface JSONSchemaObject extends JSONSchema {
  properties: Record<string, JSONSchema | boolean>
}

export type Properties<S extends JSONSchemaObject> = keyof S['properties']

export type RequiredProperties<
  S extends JSONSchemaObject
> = S['required'] extends Array<infer P> ? P & Properties<S> : never

export type OptionalProperties<S extends JSONSchemaObject> = Exclude<
  Properties<S>,
  RequiredProperties<S>
>

export type PropertiesObject<S extends JSONSchemaObject, D> = Compute<
  {
    [P in RequiredProperties<S>]: Schema<S['properties'][P], D>
  } &
    { [P in OptionalProperties<S>]?: Schema<S['properties'][P], D> } &
    (S['additionalProperties'] extends false
      ? {}
      : { [_ in string]: Schema<S['additionalProperties'], D> })
>

/**
 * Reference objects such as `{ "$ref": "#some-id" }`:
 */

interface JSONSchemaRef extends JSONSchema {
  $ref: string
}

export type RefObject<S extends JSONSchemaRef, D> = D extends Definitions
  ? D[S['$ref']]
  : never

/*
 * Finite recursion up to a maximum depth of 10:
 */

type AllOf<T> = Compute<UnionToIntersection<T>>

type S1<S, D, R = Resolve<S, D>> = R extends ['recur', infer T]
  ? S2<T, D>
  : R extends ['allOf', infer T]
  ? AllOf<S2<T, D>>
  : R

type S2<S, D, R = Resolve<S, D>> = R extends ['recur', infer T]
  ? S3<T, D>
  : R extends ['allOf', infer T]
  ? AllOf<S3<T, D>>
  : R

type S3<S, D, R = Resolve<S, D>> = R extends ['recur', infer T]
  ? S4<T, D>
  : R extends ['allOf', infer T]
  ? AllOf<S4<T, D>>
  : R

type S4<S, D, R = Resolve<S, D>> = R extends ['recur', infer T]
  ? S5<T, D>
  : R extends ['allOf', infer T]
  ? AllOf<S5<T, D>>
  : R

type S5<S, D, R = Resolve<S, D>> = R extends ['recur', infer T]
  ? S6<T, D>
  : R extends ['allOf', infer T]
  ? AllOf<S6<T, D>>
  : R

type S6<S, D, R = Resolve<S, D>> = R extends ['recur', infer T]
  ? S7<T, D>
  : R extends ['allOf', infer T]
  ? AllOf<S7<T, D>>
  : R

type S7<S, D, R = Resolve<S, D>> = R extends ['recur', infer T]
  ? S8<T, D>
  : R extends ['allOf', infer T]
  ? AllOf<S8<T, D>>
  : R

type S8<S, D, R = Resolve<S, D>> = R extends ['recur', infer T]
  ? S9<T, D>
  : R extends ['allOf', infer T]
  ? AllOf<S9<T, D>>
  : R

type S9<S, D, R = Resolve<S, D>> = R extends ['recur', infer T]
  ? S10<T, D>
  : R extends ['allOf', infer T]
  ? AllOf<S10<T, D>>
  : R

type S10<S, D, R = Resolve<S, D>> = R extends ['recur' | 'allOf', infer T]
  ? never
  : R
