import * as path from "path";
import cp from "child_process";
import os from 'os';
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";

interface CliResolverConfig{
  installerZipInArchiveUrl: string;
}
interface CliInfo extends CliResolverConfig {
  cliVersion: string;
}

const cliResolverConfigsByVersion = new Map<string, CliResolverConfig>([
  [
    "5.0.1",
    {
      installerZipInArchiveUrl: 'https://github.com/corda/corda-runtime-os/releases/download/release-5.0.1.0/corda-cli-installer-5.0.1.0.zip'
    }
  ],
  [
    "5.1.0",
    {
      installerZipInArchiveUrl: 'https://github.com/corda/corda-runtime-os/releases/download/release-5.1.0.0/corda-cli-installer-5.1.0.0.zip'
    }
  ],
]);

async function run() {
  let cliVersion = core.getInput("cli-version", {
    required: false,
    trimWhitespace: true,
  });
  let installerZipInArchiveUrl = core.getInput("cli-installer-zip-url", {
    required: false,
    trimWhitespace: true,
  });

  // Either version or custom location is required
  if (!cliVersion && !installerZipInArchiveUrl) {
    core.setFailed(`Either cli-version input or cli-installer-zip-url inputs must be specified`);
  }

  // If a custom location is used
  if (!cliVersion) {
    // Infer version
    const matches = installerZipInArchiveUrl.substring(installerZipInArchiveUrl.lastIndexOf('/')  + 1)
        .match(/\b\d+(?:\.\d+)*\b/);
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
    installerZipInArchiveUrl = predefinedConfig!.installerZipInArchiveUrl
  }


  try {
    await setupCordaCli({cliVersion, installerZipInArchiveUrl});
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
    return cliInfo.installerZipInArchiveUrl;
  }

  core.debug(`Fetching cordaCli from ${cliInfo.installerZipInArchiveUrl}")`);
  await fetchCordaCliInstaller(cliInfo);

}

async function fetchCordaCliInstaller(cliInfo: CliInfo) {

  let downloadPath: string;
  try {
    downloadPath = await tc.downloadTool(cliInfo.installerZipInArchiveUrl, undefined);
  } catch (error: any) {
    throw new Error(`Failed to download Corda platform jars from ${cliInfo.installerZipInArchiveUrl}: ${error?.message ?? error}`);
  }


  core.warning(`Downloaded CLI archive in: ${downloadPath}`);
  const installerUnzippedDir = await tc.extractZip(downloadPath);
  const cachedInstallerDirPath = await tc.cacheDir(installerUnzippedDir, "cordaCli", cliInfo.cliVersion);

  await installCordaCli(cachedInstallerDirPath);
}

function assertNever(_: never): never {
  throw new Error("This code should not be reached");
}

run();
