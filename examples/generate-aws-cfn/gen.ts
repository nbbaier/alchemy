import { alchemize } from "alchemy";
import { AWSService, awsServices } from "alchemy/aws/auto";
import { Folder } from "alchemy/fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __root = path.resolve(__dirname, "..", "..");

const requirementsDir = new Folder(
  "requirements",
  path.join(__dirname, "requirements"),
);

const srcDir = new Folder("src", path.join(__dirname, "src"));
const testDir = new Folder("test", path.join(__dirname, "test"));

const iam = new AWSService("AWS::IAM", {
  ...awsServices.IAM,
  requirementsDir: requirementsDir.path,
  srcDir: srcDir.path,
  rootDir: __root,
  testDir: testDir.path,
});

await alchemize({
  mode: process.argv.includes("destroy") ? "destroy" : "up",
});
