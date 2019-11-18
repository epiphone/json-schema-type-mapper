// tslint:disable:no-implicit-dependencies
import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import { JSONValue, Schema } from '.'

// Empty and boolean schemas:

declare const empty: Schema<{}>
expectType<JSONValue>(empty)

declare const notDefined: Schema<undefined>
expectType<JSONValue>(notDefined)

declare const truthy: Schema<true>
expectType<JSONValue>(truthy)

declare const falsey: Schema<false>
expectType<never>(falsey)

// TODO handle alternative negation schemas:
// declare const notAny: Schema<{ not: {} }>
// expectType<never>(notAny)
// declare const notTruthy: Schema<{ not: true }>
// expectType<never>(notTruthy)

// Basic schemas:

declare const basicString: Schema<{ type: 'string' }>
expectType<string>(basicString)

declare const basicNumber: Schema<{ type: 'number' }>
expectType<number>(basicNumber)

declare const basicInteger: Schema<{ type: 'integer' }>
expectType<number>(basicInteger)

declare const basicNull: Schema<{ type: 'null' }>
expectType<null>(basicNull)

declare const basicBoolean: Schema<{ type: 'boolean' }>
expectType<boolean>(basicBoolean)

declare const multipleBasic1: Schema<{ type: ['string'] }>
expectType<string>(multipleBasic1)

declare const multipleBasic2: Schema<{ type: ['string', 'null', 'boolean'] }>
expectType<string | null | boolean>(multipleBasic2)

// Enum and const schemas:

declare const enumBasic: Schema<{ enum: ['some', 'other', 3] }>
expectType<'some' | 'other' | 3>(enumBasic)

declare const enumTypeOverride: Schema<{ enum: [1, 2, '3']; type: 'string' }>
expectType<'3'>(enumTypeOverride)

declare const constBasic: Schema<{ const: false }>
expectType<false>(constBasic)

declare const constComplex: Schema<{ const: { x: [1, 2] } }>
expectType<{ x: [1, 2] }>(constComplex)

// Negation schemas with basic types:

declare const basicNot: Schema<{ not: { type: 'string' } }>
expectType<number | boolean | null>(basicNot)

declare const basicNotNumber: Schema<{ not: { type: 'number' } }>
expectType<string | boolean | null>(basicNotNumber)

declare const basicNotInteger: Schema<{ not: { type: 'integer' } }>
expectType<string | boolean | null>(basicNotInteger)

declare const basicNotMultiple: Schema<{ not: { type: ['null', 'boolean'] } }>
expectType<string | number>(basicNotMultiple)

// Array schemas:

declare const arrayAny: Schema<{ type: 'array' }>
expectType<JSONValue[]>(arrayAny)

declare const arrayBasic: Schema<{ type: 'array'; items: { type: 'boolean' } }>
expectType<boolean[]>(arrayBasic)

declare const arrayMultipleBasic: Schema<{
  type: 'array'
  items: { type: ['string', 'boolean'] }
}>
expectType<Array<string | boolean>>(arrayMultipleBasic)

// Tuple schemas:

declare const tuple: Schema<{
  type: 'array'
  items: [{ type: 'string' }, { type: 'null' }, { const: 'asd' }]
}>
expectType<
  [] | [string] | [string, null] | [string, null, 'asd', ...JSONValue[]]
>(tuple)

declare const tupleAdditional: Schema<{
  type: 'array'
  additionalItems: { type: 'string' }
  items: [{ type: 'string' }, { type: 'null' }]
}>
expectType<[] | [string] | [string, null, ...string[]]>(tupleAdditional)

declare const tupleMaxLength: Schema<{
  type: 'array'
  items: [{ type: 'string' }, { type: 'null' }, true, true, true, true]
}>
expectType<
  | []
  | [string]
  | [string, null]
  | [string, null, JSONValue]
  | [string, null, JSONValue, JSONValue]
  | [string, null, JSONValue, JSONValue, JSONValue]
  | [string, null, JSONValue, JSONValue, JSONValue, JSONValue, ...JSONValue[]]
>(tupleMaxLength)

declare const tupleNoAdditional: Schema<{
  type: 'array'
  additionalItems: false
  items: [{ type: 'string' }, { type: 'null' }]
}>
expectType<[] | [string] | [string, null]>(tupleNoAdditional)

// $id references:

declare const idSchema: Schema<{
  definitions: {
    name: {
      $id: '#name'
      type: 'string'
    }
  }
  $ref: '#name'
}>
expectType<string>(idSchema)

declare const idArraySchema: Schema<{
  definitions: {
    level: {
      $id: '#level'
      enum: [1, 2]
    }
  }
  type: 'array'
  items: {
    $ref: '#level'
  }
}>
expectType<Array<1 | 2>>(idArraySchema)

// Object schemas:
// TODO: use `expectType` instead of `expectAssignable` for stricter checks

declare const emptyObjectSchema: Schema<{
  type: 'object'
}>
expectAssignable<Record<string, JSONValue>>(emptyObjectSchema)

declare const emptyPropertiesSchema: Schema<{
  properties: {}
}>
expectAssignable<Record<string, JSONValue>>(emptyPropertiesSchema)

declare const emptyNoAdditionalObjectSchema: Schema<{
  type: 'object'
  properties: {}
  additionalProperties: false
}>
expectAssignable<{ [_ in string]: never }>(emptyNoAdditionalObjectSchema)
expectNotAssignable<{ x: JSONValue }>(emptyNoAdditionalObjectSchema)

declare const basicObjectSchema: Schema<{
  type: 'object'
  properties: { x: { type: 'string' }; y: { type: 'number' } }
  required: ['x']
}>
expectAssignable<{ x: string; y?: number }>(basicObjectSchema)
expectAssignable<{ x: string; y?: number; z?: JSONValue }>(basicObjectSchema)

declare const basicObjectNoAdditionalSchema: Schema<{
  type: 'object'
  properties: { x: { type: 'string' }; y: { type: 'number' } }
  required: ['x']
  additionalProperties: false
}>
expectNotAssignable<{ x: string; y?: number; z: string }>(
  basicObjectNoAdditionalSchema
)

declare const nestedObjectSchema: Schema<{
  type: 'object'
  properties: {
    x: {
      properties: { y: { type: 'string' } }
    }
  }
  additionalProperties: false
}>
expectAssignable<{ x?: { y?: string } }>(nestedObjectSchema)

// anyOf:

declare const anyOfSchema: Schema<{
  anyOf: [{ type: 'string' }, { type: 'number' }]
}>
expectType<string | number>(anyOfSchema)

declare const anyOfArraySchema: Schema<{
  type: 'array'
  items: {
    anyOf: [{ type: 'string' }, { type: 'array'; items: { type: 'number' } }]
  }
}>
expectType<Array<string | number[]>>(anyOfArraySchema)

declare const anyOfObjectSchema: Schema<{
  type: 'object'
  properties: {
    x: {
      anyOf: [{ type: 'string' }, { type: 'array'; items: { type: 'number' } }]
    }
  }
  required: ['x']
}>
expectAssignable<{ x: string | number[] }>(anyOfObjectSchema)
expectNotAssignable<{ x: null }>(anyOfObjectSchema)

// allOf:

declare const allOfSchema: Schema<{
  allOf: [{ type: 'string' }, { type: 'number' }]
}>
expectType<string & number>(allOfSchema)

declare const allOfObjectSchema: Schema<{
  allOf: [
    { properties: { x: { type: 'string' } }; additionalProperties: false },
    { properties: { y: { type: 'number' } }; additionalProperties: false }
  ]
}>
expectAssignable<{ x?: string; y?: number }>(allOfObjectSchema)
expectNotAssignable<{ x?: string; y?: number; z: number }>(allOfObjectSchema)
