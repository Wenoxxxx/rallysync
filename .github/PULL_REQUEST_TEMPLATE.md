## Description

<!-- What does this PR do? Why is the change needed? -->


## Actual Changes

<!-- CI updates the generated block below with commits and changed files. -->
<!-- ci-summary:start -->
_CI will populate the actual change summary._
<!-- ci-summary:end -->

## How to Test

<!-- List exact commands and manual scenarios. Do not leave this as a placeholder. -->

```bash
# Backend
cd server
npm ci
npm test
npm run lint

# Frontend
cd ../app
npm ci
npm test
npm run lint
npm run build
```

## Type

<!-- Select exactly one change type. -->
- [ ] feat
- [ ] fix
- [ ] docs
- [ ] style
- [ ] refactor
- [ ] perf
- [ ] test
- [ ] chore
- [ ] ci
- [ ] build
- [ ] revert

## Checklist

- [ ] Tests were added or updated, or this change does not need tests (explain above).
- [ ] Relevant tests passed locally.
- [ ] Relevant lint checks passed.
- [ ] Build passed when the changed surface has a build.
- [ ] I reviewed `CODE_STANDARDS.md` and this change follows it.
