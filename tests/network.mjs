import { Agent, setGlobalDispatcher } from 'undici';

// Try alternate DNS addresses when one Cloudflare edge address is unreachable.
// Never retry an HTTP mutation after it has been sent.
setGlobalDispatcher(new Agent({ connect: { timeout: 30000, autoSelectFamily: true, autoSelectFamilyAttemptTimeout: 250 } }));
