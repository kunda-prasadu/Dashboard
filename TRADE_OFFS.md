# Trade-offs

## Zoneless + SSR
SSR with zoneless requires careful handling of platform checks (`isPlatformBrowser`) because effects/signals may run on the server. Trade-off: more explicit code, but no hydration mismatch issues from zone timings.

## Custom Signal Store vs NgRx Signal Store
NgRx Signal Store is more opinionated and has devtools. Our custom store is lighter but has no time-travel debugging. Acceptable for this scope; revisit if state complexity grows.

## Express Mock API vs json-server
json-server can't handle OR-based multi-field search correctly (ANDs `_like` params). Express gives full control over filter logic. Trade-off: more boilerplate, but correct behavior.

## No Client-Side Pagination Cache
We fetch exactly one page at a time and do not cache adjacent pages. Trade-off: slightly more HTTP requests on back-navigation, but simpler state and guaranteed freshness.

## Material Icons Local Package
The `material-icons` npm package includes the full icon font (~200 kB). An icon-subset approach would be smaller but adds build complexity. Acceptable at this stage.
