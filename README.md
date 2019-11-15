# json-schema-type-mapper

## Work in progress!

Type-level conversion of JSON Schema into TypeScript types: **handle JSON Schemas as TypeScript types without code generation**.

```typescript
import { Schema } from `json-schema-type-mapper`

declare const myString: Schema<{ type: 'string' }>
//      resolves to --> string
```

## Install

~~`yarn add json-schema-type-mapper`~~

## Use case

Suppose you're dealing with the following JSON Schema:

```typescript
interface User {
  type: 'object'
  properties: {
    id: {
      type: 'number'
    }
    name: {
      type: 'string'
    }
  }
  required: ['id']
  additionalProperties: false
}
```

And a function whose input conforms to that schema:

```typescript
function saveUser(user: any) {
  // ...
}
```

The question is, how would you define `user` parameter's type? There's a couple of ways to go about it. Either **a) manually write out** a TypeScript type definition that matches the above JSON Schema, or **b) use a code generation tool** such as [`json-schema-to-typescript`](https://github.com/bcherny/json-schema-to-typescript) to convert the JSON Schema to a TypeScript interface.

I'd probably go the manual route in a simple case like this and opt for code generation when the schema gets more complex. This library however provides a bit of a middle ground between the two by leveraging the type system to convert from JSON Schema to TypeScript:

```typescript
import { Schema } from 'json-schema-type-mapper'

function saveUser(user: Schema<User>) {
  // ...
}
```

Now `user`'s type resolves to `{ id: number; name?: string }`.


Compared to code generation, this method has a number of [limitations](#Unsupported) resulting from the type system's limitations. We get pretty far however, which in itself is testament to the impressive capabilities of TypeScript's type system.

For a thorough list of supported features and examples check [the test file](./index.test-d.ts).

## TODO

- [ ] support specifying schema as variable (`const schema = { ... } as const`) instead of type
    - requires handling `DeepReadonly<JSONSchema>` type
- [ ] specify draft?
- [ ] object `dependencies` https://json-schema.org/understanding-json-schema/reference/object.html#dependencies
- [ ] object `patternProperties` https://json-schema.org/understanding-json-schema/reference/object.html#dependencies
- [ ] array `contains` https://json-schema.org/understanding-json-schema/reference/array.html#list-validation
- [ ] `allOf`, `anyOf`, `oneOf` https://json-schema.org/understanding-json-schema/reference/combining.html
- [ ] `if`, `then`, `else` https://json-schema.org/understanding-json-schema/reference/conditionals.html
- [ ] `$id` https://json-schema.org/understanding-json-schema/structuring.html#using-id-with-ref

## Unsupported

- `not` only works on primitive values such as `{ "not": { "type": ["number", "string"] } }`
- `$ref` requires hand-filling a mapping of `Record<$ref URL, path to definition | definition object>`, recommend using `$id` instead?
- `$ref` and recursion https://json-schema.org/understanding-json-schema/structuring.html#recursion
- object `propertyNames` https://json-schema.org/understanding-json-schema/reference/object.html#property-names
- object `minProperties`/`maxProperties` https://json-schema.org/understanding-json-schema/reference/object.html#size
- [tuple `items: [...]`](https://json-schema.org/understanding-json-schema/reference/array.html#list-validation) limited to a maximum of 6 items for now
- [array `minItems`/`maxItems`](https://json-schema.org/understanding-json-schema/reference/array.html#length)
    - hardcoding might work when list length is below a reasonable number...?
- [array `uniqueness`](https://json-schema.org/understanding-json-schema/reference/array.html#uniqueness)
    - [maybe feasible](https://stackoverflow.com/a/57021889/1763012) for primitives, not so much for objects?

## Related projects

- [as-typed](https://github.com/wix-incubator/as-typed) with a similar effort of type-level Schema-to-Typescript conversion
- [json-schema-typed](https://github.com/typeslick/json-schema-typed) provides TypeScript definitions for JSON Schema objects
