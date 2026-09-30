// The one sanctioned import of Zod. Every schema in the repo gets `z` from here.
//
// Zod 4 probes `new Function('')` to decide whether it may JIT-compile parsers.
// The app runs under a CSP without 'unsafe-eval' (ADR-0012), where the probe is
// blocked and reported as a securitypolicyviolation even though the throw is
// caught. Turning JIT off skips the probe, but Zod reads the setting when each
// schema is constructed, so it must be set before the first one. A module that
// only calls z.config() for its side effect is not enough: the bundler is free
// to evaluate it after the chunk that already built the schemas. Re-exporting
// `z` makes the ordering a data dependency instead — no schema can be built
// without this module having run first.
// eslint-disable-next-line no-restricted-imports -- the one place allowed to import zod directly
import { z } from 'zod';

z.config({ jitless: true });

export { z };
