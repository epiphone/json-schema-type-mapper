import { JSONSchema } from 'json-schema-typed'

/**
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

/**
 * Root schema
 *
 * `Schema` cannot refer to itself recursively so we define another, partly
 * overlapping type `Property` as means of indirection:
 */

export type Schema<S extends JSONSchema | boolean | undefined> = S extends false
  ? never // TODO: handle other negation types such as `{ not: true }` and `{ not: {} }`
  : S extends JSONSchema
  ? Property<S>
  : JSONValue // `Schema<true | undefined | {}>` resolves to any valid JSON value

export type Property<S extends JSONSchema> = S extends JSONSchemaNot
  ? NotObject<S>
  : S extends JSONSchemaConst
  ? ConstObject<S>
  : S extends JSONSchemaEnum
  ? EnumObject<S>
  : S extends JSONSchemaPrimitive
  ? PrimitiveObject<S>
  : S extends JSONSchemaArray
  ? ArrayObject<S>
  : S extends JSONSchemaObject
  ? PropertiesObject<S>
  : S extends { type: 'object' } // Handle empty objects: `{ "type": "object" }`
  ? PropertiesObject<S & { properties: {} }>
  : JSONValue

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
 * ARRAY SCHEMA:
 */

interface JSONSchemaArray extends JSONSchema {
  type: 'array'
}

export type ArrayObject<
  S extends JSONSchemaArray
> = S['items'] extends JSONSchema
  ? Schema<S['items']>[]
  : S extends JSONSchemaTuple
  ? TupleObject<S>
  : JSONValue[] // when `items` is undefined, allow an array of any JSON values

interface JSONSchemaTuple extends JSONSchema {
  type: 'array'
  items: (JSONSchema | boolean)[]
}

// The ugly part - tuple schemas for now work up to a maximum of 6 hardcoded items:

export type TupleObject<
  S extends JSONSchemaTuple
> = S['additionalItems'] extends false
  ? TupleNoAdditionalObject<S>
  : TupleWithAdditionalObject<S>

type TupleNoAdditionalObject<S extends JSONSchemaTuple> = S['items'] extends [
  infer S1
]
  ? [] | [Schema<S1>]
  : S['items'] extends [infer S1, infer S2]
  ? [] | [Schema<S1>] | [Schema<S1>, Schema<S2>]
  : S['items'] extends [infer S1, infer S2, infer S3]
  ?
      | []
      | [Schema<S1>]
      | [Schema<S1>, Schema<S2>]
      | [Schema<S1>, Schema<S2>, Schema<S3>]
  : S['items'] extends [infer S1, infer S2, infer S3, infer S4]
  ?
      | []
      | [Schema<S1>]
      | [Schema<S1>, Schema<S2>]
      | [Schema<S1>, Schema<S2>, Schema<S3>]
      | [Schema<S1>, Schema<S2>, Schema<S3>, Schema<S4>]
  : S['items'] extends [infer S1, infer S2, infer S3, infer S4, infer S5]
  ?
      | []
      | [Schema<S1>]
      | [Schema<S1>, Schema<S2>]
      | [Schema<S1>, Schema<S2>, Schema<S3>]
      | [Schema<S1>, Schema<S2>, Schema<S3>, Schema<S4>]
      | [Schema<S1>, Schema<S2>, Schema<S3>, Schema<S4>, Schema<S5>]
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
      | [Schema<S1>]
      | [Schema<S1>, Schema<S2>]
      | [Schema<S1>, Schema<S2>, Schema<S3>]
      | [Schema<S1>, Schema<S2>, Schema<S3>, Schema<S4>]
      | [Schema<S1>, Schema<S2>, Schema<S3>, Schema<S4>, Schema<S5>]
      | [Schema<S1>, Schema<S2>, Schema<S3>, Schema<S4>, Schema<S5>, Schema<S6>]
  : never

type TupleWithAdditionalObject<S extends JSONSchemaTuple> = S['items'] extends [
  infer S1
]
  ? [] | [Schema<S1>, ...Schema<S['additionalItems']>[]]
  : S['items'] extends [infer S1, infer S2]
  ?
      | []
      | [Schema<S1>]
      | [Schema<S1>, Schema<S2>, ...Schema<S['additionalItems']>[]]
  : S['items'] extends [infer S1, infer S2, infer S3]
  ?
      | []
      | [Schema<S1>]
      | [Schema<S1>, Schema<S2>]
      | [Schema<S1>, Schema<S2>, Schema<S3>, ...Schema<S['additionalItems']>[]]
  : S['items'] extends [infer S1, infer S2, infer S3, infer S4]
  ?
      | []
      | [Schema<S1>]
      | [Schema<S1>, Schema<S2>]
      | [Schema<S1>, Schema<S2>, Schema<S3>]
      | [
          Schema<S1>,
          Schema<S2>,
          Schema<S3>,
          Schema<S4>,
          ...Schema<S['additionalItems']>[]
        ]
  : S['items'] extends [infer S1, infer S2, infer S3, infer S4, infer S5]
  ?
      | []
      | [Schema<S1>]
      | [Schema<S1>, Schema<S2>]
      | [Schema<S1>, Schema<S2>, Schema<S3>, Schema<S4>]
      | [
          Schema<S1>,
          Schema<S2>,
          Schema<S3>,
          Schema<S4>,
          Schema<S5>,
          ...Schema<S['additionalItems']>[]
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
      | [Schema<S1>]
      | [Schema<S1>, Schema<S2>]
      | [Schema<S1>, Schema<S2>, Schema<S3>]
      | [Schema<S1>, Schema<S2>, Schema<S3>, Schema<S4>]
      | [Schema<S1>, Schema<S2>, Schema<S3>, Schema<S4>, Schema<S5>]
      | [
          Schema<S1>,
          Schema<S2>,
          Schema<S3>,
          Schema<S4>,
          Schema<S5>,
          Schema<S6>,
          ...Schema<S['additionalItems']>[]
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

export type PropertiesObject<S extends JSONSchemaObject> = {
  [P in RequiredProperties<S>]: Schema<S['properties'][P]>
} &
  { [P in OptionalProperties<S>]?: Schema<S['properties'][P]> } &
  { [_ in string]: Schema<S['additionalProperties']> }
