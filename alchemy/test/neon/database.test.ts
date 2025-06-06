import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { destroy } from "../../src/destroy.ts";
import { createNeonApi } from "../../src/neon/api.ts";
import { NeonBranch } from "../../src/neon/index.ts";
import { NeonDatabase } from "../../src/neon/index.ts";
import { NeonProject } from "../../src/neon/project.ts";
import { BRANCH_PREFIX } from "../util.ts";
import "../../src/test/vitest.ts";

const api = createNeonApi();

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("NeonDatabase Resource", () => {
  const testId = `${BRANCH_PREFIX}-test-neon-database`;

  const generateDatabaseName = () =>
    `test_db_${testId}_${Date.now()}`.replace(/-/g, "_");

  test("create, update, and delete neon database", async (scope) => {
    let project: any;
    let branch: any;
    let database: any;

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

      const databaseName = generateDatabaseName();
      database = await NeonDatabase(testId, {
        project: project.id,
        branch: branch.id,
        name: databaseName,
        ownerName: project.roles[0].name,
      });

      expect(database.id).toBeTruthy();
      expect(database.name).toEqual(databaseName);
      expect(database.branchId).toEqual(branch.id);
      expect(database.ownerName).toBeTruthy();
      expect(database.createdAt).toBeTruthy();
      expect(database.updatedAt).toBeTruthy();

      const listResponse = await api.get(
        `/projects/${project.id}/branches/${branch.id}/databases`,
      );
      expect(listResponse.status).toEqual(200);

      const responseData: any = await listResponse.json();
      const foundDatabase = responseData.databases.find(
        (db: any) => db.name === databaseName,
      );
      expect(foundDatabase).toBeTruthy();
      expect(foundDatabase.name).toEqual(databaseName);

      const updatedOwner = project.roles[0].name;
      database = await NeonDatabase(testId, {
        project: project.id,
        branch: branch.id,
        name: databaseName,
        ownerName: updatedOwner,
      });

      expect(database.id).toBeTruthy();
      expect(database.ownerName).toEqual(updatedOwner);
    } finally {
      await destroy(scope);

      if (database?.name && project?.id && branch?.id) {
        const listDeletedResponse = await api.get(
          `/projects/${project.id}/branches/${branch.id}/databases`,
        );
        if (listDeletedResponse.ok) {
          const deletedData: any = await listDeletedResponse.json();
          const foundDeleted = deletedData.databases?.find(
            (db: any) => db.name === database!.name,
          );
          expect(foundDeleted).toBeFalsy();
        }
      }
    }
  });

  test("adopt existing database", async (scope) => {
    let project: any;
    let branch: any;
    let database: any;

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

      const databaseName = generateDatabaseName();
      const createResponse = await api.post(
        `/projects/${project.id}/branches/${branch.id}/databases`,
        {
          database: {
            name: databaseName,
            ownerName: project.roles[0].name,
          },
        },
      );
      expect(createResponse.status).toEqual(201);
      const createdDatabase: any = await createResponse.json();

      database = await NeonDatabase(`${testId}-adopt`, {
        project: project.id,
        branch: branch.id,
        name: databaseName,
        ownerName: project.roles[0].name,
        adopt: true,
      });

      expect(database.id).toEqual(createdDatabase.database.id);
      expect(database.name).toEqual(databaseName);
      expect(database.branchId).toEqual(branch.id);
    } finally {
      await destroy(scope);
    }
  });
});
