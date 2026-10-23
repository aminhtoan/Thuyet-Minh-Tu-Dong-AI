# Customer design synchronization

For Customer UI changes, read `../docs/WEB_MOBILE_DESIGN_SYNC.md` first.
Shared tokens live in `../design/customer/tokens.json`; never hand-edit generated
adapters. Check the corresponding Mobile screen/component and record parity or
an explicit capability gap. Do not redesign unrelated screens or make API changes
to force parity. Public Museum is excluded from the Customer token scope.
Run both design:check scripts and the relevant tests on both platforms.
