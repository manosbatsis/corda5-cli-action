# Corda 5 CLI Action 

Adds Corda 5 CLI to your [GitHub actions](https://github.com/features/actions). 
Works well with [corda5-testutils](https://github.com/manosbatsis/corda5-testutils). 

Example workflow fragment bellow:

```yaml
jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Set up JDK
        uses: actions/setup-java@v3
        with:
          distribution: 'zulu'
          java-version: '17'
      - name: Setup Corda CLI
        uses: manosbatsis/corda5-cli-action@v2.0.1
        with:
          cli-version: '5.0.1' # or 5.1.0
          # Or use custom location, e.g. 
          # cli-installer-zip-url: 'https://github.com/corda/corda-runtime-os/releases/download/release-5.0.1.0/corda-cli-installer-5.0.1.0.zip'
      - name: Build with Gradle
        uses: gradle/gradle-build-action@v2
        with:
          arguments: build test
```

## Examples

You can find a complete example built on top of CSDE at the [CSDE-cordapp-integration-testing](https://github.com/manosbatsis/CSDE-cordapp-integration-testing) repo.
There is also a relevant Medium article [here](https://medium.com/@manosbatsis/corda5-integration-testing-4e98d6a195cd). 

## Feedback

Issues, PRs etc. welcome. You can also try pinging me on https://cordaledger.slack.com
