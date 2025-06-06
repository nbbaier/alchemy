import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { destroy } from "../../src/destroy.ts";
import { createNeonApi } from "../../src/neon/api.ts";
import { NeonBranch } from "../../src/neon/index.ts";
import { NeonProject } from "../../src/neon/project.ts";
import { BRANCH_PREFIX } from "../util.ts";
import "../../src/test/vitest.ts";

const api = createNeonApi();

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("NeonBranch Resource", () => {
  const testId = `${BRANCH_PREFIX}-test-neon-branch`;

  const generateBranchName = () => `Test Branch ${testId}-${Date.now()}`;

  test("create, update, and delete neon branch", async (scope) => {
    let project: any;
    let branch: any;

    try {
      project = await NeonProject(`${testId}-project`, {
        name: `Test Project ${testId}-${Date.now()}`,
        regionId: "aws-us-east-1",
        pg_version: 15,
      });

      const branchName = generateBranchName();
      branch = await NeonBranch(testId, {
        project: project.id,
        name: branchName,
      });

      expect(branch).toMatchObject({
        id: expect.any(String),
        name: branchName,
        projectId: project.id,
        currentState: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      const getResponse = await api.get(
        `/projects/${project.id}/branches/${branch.id}`,
      );
      expect(getResponse.status).toEqual(200);

      const responseData: any = await getResponse.json();
      expect(responseData.branch.name).toEqual(branchName);

      expect(branch.currentState).toEqual("ready");

      const updatedName = `${generateBranchName()}-updated`;
      branch = await NeonBranch(testId, {
        project: project.id,
        name: updatedName,
      });

      expect(branch).toMatchObject({
        id: expect.any(String),
        name: updatedName,
        projectId: project.id,
      });

      const getUpdatedResponse = await api.get(
        `/projects/${project.id}/branches/${branch.id}`,
      );
      const updatedData: any = await getUpdatedResponse.json();
      expect(updatedData.branch.name).toEqual(updatedName);
    } finally {
      await destroy(scope);

      if (branch?.id && project?.id) {
        const getDeletedResponse = await api.get(
          `/projects/${project.id}/branches/${branch.id}`,
        );
        expect(getDeletedResponse.status).toEqual(404);
      }
    }
  });

  test("adopt existing branch", async (scope) => {
    let project: any;
    let branch: any;

    try {
      project = await NeonProject(`${testId}-project-adopt`, {
        name: `Test Project Adopt ${testId}-${Date.now()}`,
        regionId: "aws-us-east-1",
        pg_version: 15,
      });

      const branchName = generateBranchName();
      const createResponse = await api.post(
        `/projects/${project.id}/branches`,
        {
          branch: { name: branchName },
        },
      );
      expect(createResponse.status).toEqual(201);
      const createdBranch: any = await createResponse.json();

      branch = await NeonBranch(`${testId}-adopt`, {
        project: project.id,
        name: branchName,
        adopt: true,
      });

      expect(branch).toMatchObject({
        id: createdBranch.branch.id,
        name: branchName,
        projectId: project.id,
      });
    } finally {
      await destroy(scope);
    }
  });
});
