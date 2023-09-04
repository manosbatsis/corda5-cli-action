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
          java-version: '11'
      - name: Setup Corda CLI
        uses: manosbatsis/corda5-cli-action@v1.0.7
      - name: Build with Gradle
        uses: gradle/gradle-build-action@v2
        with:
          arguments: build test
```

