import * as path from "path";
import cp from "child_process";
import os from 'os';
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";

interface CliResolverConfig{
  platformJarsUrl: string;
  installerZipInArchivePath: string;
}
interface CliInfo extends CliResolverConfig {
  cliVersion: string;
}

const cliResolverConfigsByVersion = new Map<string, CliResolverConfig>([
  [
    "5.0.0",
    {
      platformJarsUrl: 'https://download.corda.net/c5-release-pack/E0b6f4f8-8907-47ae-b3cd-7f25ff756c2f-5.0.0-GA/platform-jars-5.0.0.tar.gz',
      installerZipInArchivePath: 'net/corda/cli/deployment/corda-cli-installer/5.0.0.0/corda-cli-installer-5.0.0.0.zip'
    }
  ],
  [
    "5.1.0",
    {
      platformJarsUrl: 'https://download.corda.net/c5-release-pack/f82c7008-3b72-48fb-8e25-5ca38a9483b1-5.1.0/platform-jars-5.1.0.tar.gz',
      installerZipInArchivePath: 'net/corda/cli/deployment/corda-cli-installer/5.1.0.0/corda-cli-installer-5.1.0.0.zip'
    }
  ],
]);

async function run() {
  let cliVersion = core.getInput("cli-version", {
    required: false,
    trimWhitespace: true,
  });
  let platformJarsUrl = core.getInput("platform-jars-url", {
    required: false,
    trimWhitespace: true,
  });
  let installerZipInArchivePath = core.getInput("installer-zip-in-archive-path", {
    required: false,
    trimWhitespace: true,
  });

  // Either version or custom location accepted and required
  if (!cliVersion && !platformJarsUrl) {
    core.setFailed(`Either cli-version input or platform-jars-url and installer-zip-in-archive-path inputs must be specified`);
  }
  // ... but not both
  if (cliVersion && platformJarsUrl) {
    core.setFailed(`Either cli-version input or platform-jars-url and installer-zip-in-archive-path inputs are accepted but not both`);
  }

  // If a custom location is used
  if (!cliVersion) {
    // Custom location requires both Jar URL and archive path
    if (!platformJarsUrl || !installerZipInArchivePath) {
      core.setFailed(`Both platform-jars-url and installer-zip-in-archive-path inputs are required for custom location`);
    }
    // Infer version
    const matches = platformJarsUrl.substring(platformJarsUrl.lastIndexOf('/')  + 1).match(/\b\d+(?:\.\d+)*\b/);
    if (!matches) {
      core.setFailed(`Could not match version in ${matches}`);
    }
    cliVersion =  matches!![0]
  }
  // Else, if a predefined version location is used
  else{
    if (!cliResolverConfigsByVersion.has(cliVersion)) {
      core.setFailed(`No predefined config found for CLI version: ${cliVersion}`);
    }
    const predefinedConfig = cliResolverConfigsByVersion.get(cliVersion)
    platformJarsUrl = predefinedConfig!.platformJarsUrl
    installerZipInArchivePath = predefinedConfig!.installerZipInArchivePath
  }


  try {
    await setupCordaCli({cliVersion, platformJarsUrl, installerZipInArchivePath});
    core.debug(`Successfully set up Corda CLI ${cliVersion}`);

    core.startGroup("Corda Cli info:");
    cp.execSync(`corda-cli.sh -h`)
    core.endGroup();

  } catch (error: any) {
    core.setFailed(error?.message ?? error ?? "Unknown error");
  }
}

async function installCordaCli(cachedToolPath: string) {
  const out = await exec.exec(`${cachedToolPath}/install.sh`);
  const homeDir = path.join(os.homedir(), ".corda/cli");
  core.warning(`homeDir: ${homeDir}`);
  core.addPath(homeDir);
}

async function setupCordaCli(cliInfo: CliInfo) {
  const cachedToolPath = tc.find("cordaCli", cliInfo.cliVersion);
  if (cachedToolPath) {
    core.info(`Found in cache @ ${cachedToolPath}`);
    await installCordaCli(cachedToolPath);
    return cliInfo.platformJarsUrl;
  }

  core.debug(`Fetching cordaCli from ${cliInfo.platformJarsUrl}")`);
  await fetchCordaCliInstaller(cliInfo);

}

async function fetchCordaCliInstaller(cliInfo: CliInfo) {

  let downloadPath: string;
  try {
    downloadPath = await tc.downloadTool(cliInfo.platformJarsUrl, undefined);
  } catch (error: any) {
    throw new Error(`Failed to download Corda platform jars from ${cliInfo.platformJarsUrl}: ${error?.message ?? error}`);
  }

  const extractionPath = await tc.extractTar(downloadPath);

  core.warning(`extractionPath: ${extractionPath}`);
  const installerZipPath = path.join(extractionPath, cliInfo.installerZipInArchivePath);
  core.warning(`installerZipPath: ${installerZipPath}`);
  const installerUnzippedDir = await tc.extractZip(installerZipPath);
  const cachedInstallerDirPath = await tc.cacheDir(installerUnzippedDir, "cordaCli", cliInfo.cliVersion);

  await installCordaCli(cachedInstallerDirPath);
}

function assertNever(_: never): never {
  throw new Error("This code should not be reached");
}

run();
