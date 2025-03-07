import { kebabCase } from "change-case";
import path from "node:path";
import { Folder } from "../../fs";
import { Resource } from "../../resource";
import { AWSResource } from "./resource";
import type { CfnService } from "./spec";

export class AWSService extends Resource(
  "aws-service",
  async (
    ctx,
    props: CfnService & {
      requirementsDir: string;
      srcDir: string;
      rootDir: string;
      testDir: string;
    },
  ) => {
    const serviceDir = new Folder(
      "service",
      path.join(props.requirementsDir, kebabCase(props.ServiceName)),
    );
    const srcDir = new Folder(
      "src",
      path.join(props.srcDir, kebabCase(props.ServiceName)),
    );
    const testDir = new Folder(
      "test",
      path.join(props.testDir, kebabCase(props.ServiceName)),
    );

    const resources = Object.entries(props.Resources);
    if (process.env.DEBUG) {
      // Only instantiate first resource in debug mode
      const [resourceName, resource] = resources[0];
      return [
        new AWSResource(resourceName, {
          ...resource,
          serviceName: props.ServiceName,
          designDir: serviceDir.path,
          srcDir: srcDir.path,
          testDir: testDir.path,
          rootDir: props.rootDir,
          resource,
        }),
      ];
    }
    return resources.map(([resourceName, resource]) => {
      return new AWSResource(resourceName, {
        ...resource,
        resource,
        serviceName: props.ServiceName,
        testDir: props.testDir,
        rootDir: props.rootDir,
        srcDir: srcDir.path,
        designDir: serviceDir.path,
      });
    });
  },
) {}
