import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { destroy } from "../../src/destroy.ts";
import { createNeonApi } from "../../src/neon/api.ts";
import { NeonBranch } from "../../src/neon/index.ts";
import { NeonEndpoint } from "../../src/neon/index.ts";
import { NeonProject } from "../../src/neon/project.ts";
import { BRANCH_PREFIX } from "../util.ts";
import "../../src/test/vitest.ts";

const api = createNeonApi();

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("NeonEndpoint Resource", () => {
  const testId = `${BRANCH_PREFIX}-test-neon-endpoint`;

  test("create, update, and delete neon endpoint", async (scope) => {
    let project: any;
    let branch: any;
    let endpoint: any;

    try {
      project = await NeonProject(`${testId}-project`, {
        name: `Test Project ${testId}-${Date.now()}`,
        region_id: "aws-us-east-1",
        pg_version: 15,
      });

      branch = await NeonBranch(`${testId}-branch`, {
        project: project.id,
        name: `Test Branch ${testId}-${Date.now()}`,
      });

      endpoint = await NeonEndpoint(testId, {
        project: project.id,
        branch: branch.id,
        type: "read_only",
      });

      expect(endpoint.id).toBeTruthy();
      expect(endpoint.type).toEqual("read_only");
      expect(endpoint.projectId).toEqual(project.id);
      expect(endpoint.branchId).toEqual(branch.id);
      expect(endpoint.host).toBeTruthy();
      expect(endpoint.currentState).toBeTruthy();
      expect(endpoint.createdAt).toBeTruthy();
      expect(endpoint.updatedAt).toBeTruthy();

      const getResponse = await api.get(
        `/projects/${project.id}/endpoints/${endpoint.id}`,
      );
      expect(getResponse.status).toEqual(200);

      const responseData: any = await getResponse.json();
      expect(responseData.endpoint.type).toEqual("read_only");

      expect(endpoint.currentState).toEqual("active");

      endpoint = await NeonEndpoint(testId, {
        project: project.id,
        branch: branch.id,
        type: "read_only",
        disabled: true,
      });

      expect(endpoint.id).toBeTruthy();
      expect(endpoint.disabled).toEqual(true);

      const getUpdatedResponse = await api.get(
        `/projects/${project.id}/endpoints/${endpoint.id}`,
      );
      const updatedData: any = await getUpdatedResponse.json();
      expect(updatedData.endpoint.disabled).toEqual(true);
    } finally {
      await destroy(scope);

      if (endpoint?.id && project?.id) {
        const getDeletedResponse = await api.get(
          `/projects/${project.id}/endpoints/${endpoint.id}`,
        );
        expect(getDeletedResponse.status).toEqual(404);
      }
    }
  });

  test("adopt existing endpoint", async (scope) => {
    let project: any;
    let branch: any;
    let endpoint: any;

    try {
      project = await NeonProject(`${testId}-project-adopt`, {
        name: `Test Project Adopt ${testId}-${Date.now()}`,
        region_id: "aws-us-east-1",
        pg_version: 15,
      });

      branch = await NeonBranch(`${testId}-branch-adopt`, {
        project: project.id,
        name: `Test Branch Adopt ${testId}-${Date.now()}`,
      });

      const createResponse = await api.post(
        `/projects/${project.id}/endpoints`,
        {
          endpoint: {
            branch: branch.id,
            type: "read_only",
          },
        },
      );
      expect(createResponse.status).toEqual(201);
      const createdEndpoint: any = await createResponse.json();

      endpoint = await NeonEndpoint(`${testId}-adopt`, {
        project: project.id,
        branch: branch.id,
        type: "read_only",
        adopt: true,
      });

      expect(endpoint.id).toEqual(createdEndpoint.endpoint.id);
      expect(endpoint.type).toEqual("read_only");
      expect(endpoint.projectId).toEqual(project.id);
      expect(endpoint.branchId).toEqual(branch.id);
    } finally {
      await destroy(scope);
    }
  });
});
