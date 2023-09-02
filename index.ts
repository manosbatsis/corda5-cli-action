import * as path from "path";
import cp from "child_process";
import os from 'os';
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import { HttpClient } from "@actions/http-client";
import * as io from "@actions/io";
import * as tc from "@actions/tool-cache";
import { compare } from "compare-versions";

async function run() {
  const userSuppliedUrl = core.getInput("platform-jars-url", {
    required: false,
    trimWhitespace: true,
  });
  const installerZipInArchivePath = core.getInput("installer-zip-in-archive-path", {
    required: false,
    trimWhitespace: true,
  });

  try {
    const effectiveVersion = await setupCordaCli(userSuppliedUrl, installerZipInArchivePath);
    core.debug(`Successfully set up Corda CLI ${effectiveVersion}`);

    core.startGroup("Corda Cli help:");
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

async function setupCordaCli(userSuppliedUrl: string, installerZipInArchivePath: string) {
  const effectiveUrl = userSuppliedUrl;
  const matches = effectiveUrl.substring(effectiveUrl.lastIndexOf('/')  + 1).match(/\b\d+(?:\.\d+)*\b/);
  if (!matches) {
    core.setFailed(`Could not match version in ${matches}`);
  }
  const effectiveVersion =  matches!![0]
  const cachedToolPath = tc.find("cordaCli", effectiveVersion);
  if (cachedToolPath) {
    core.info(`Found in cache @ ${cachedToolPath}`);
    await installCordaCli(cachedToolPath);
    return effectiveUrl;
  }

  core.debug(`Fetching cordaCli from ${effectiveUrl}")`);
  await fetchCordaCliInstaller(effectiveUrl, effectiveVersion, installerZipInArchivePath);

  return effectiveVersion;
}

async function fetchCordaCliInstaller(downloadUrl: string, effectiveVersion: string, installerZipInArchivePath: string) {

  let downloadPath: string;
  try {
    downloadPath = await tc.downloadTool(downloadUrl, undefined);
  } catch (error: any) {
    throw new Error(`Failed to download Corda platform jars from ${downloadUrl}: ${error?.message ?? error}`);
  }

  const extractionPath = await tc.extractTar(downloadPath);

  core.warning(`extractionPath: ${extractionPath}`);
  const installerZipPath = path.join(extractionPath, installerZipInArchivePath);
  core.warning(`installerZipPath: ${installerZipPath}`);
  const installerUnzippedDir = await tc.extractZip(installerZipPath);
  const cachedInstallerDirPath = await tc.cacheDir(installerUnzippedDir, "cordaCli", effectiveVersion);

  await installCordaCli(cachedInstallerDirPath);
}

function assertNever(_: never): never {
  throw new Error("This code should not be reached");
}

run();
