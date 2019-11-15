// tslint:disable:no-implicit-dependencies
import { expectType } from 'tsd'
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
