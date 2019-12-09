# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased
### Fixed
- Fix `additionalProperties: false` causing unresolvable objects like `{ x: string; [_: string]: never }`
- A single `additionalProperties: false` among `allOf` items overrides the rest

## [0.0.1] - 2019-11-22
- Initial release
