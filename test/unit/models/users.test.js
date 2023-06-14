/**
 * This eslint rule is disabled because of https://github.com/nodesecurity/eslint-plugin-security/issues/21
 * It gives linting errors in testing the DB data with keys from fixtures
 */
/* eslint-disable security/detect-object-injection */

const chai = require("chai");
const { expect } = chai;

const cleanDb = require("../../utils/cleanDb");
const users = require("../../../models/users");
const firestore = require("../../../utils/firestore");
const userModel = firestore.collection("users");
const userDataArray = require("../../fixtures/user/user")();

/**
 * Test the model functions and validate the data stored
 */

describe("users", function () {
  afterEach(async function () {
    await cleanDb();
  });

  describe("addOrUpdate", function () {
    it("should add the user collection and set the flag incompleteUserDetails and isNewUser", async function () {
      const userData = userDataArray[0];
      const { isNewUser, userId } = await users.addOrUpdate(userData);

      const data = (await userModel.doc(userId).get()).data();

      Object.keys(userData).forEach((key) => {
        expect(userData[key]).to.deep.equal(data[key]);
      });

      expect(data.incompleteUserDetails).to.equal(true);
      expect(isNewUser).to.equal(true);
    });

    it("should update the user collection and unset the flag isNewUser", async function () {
      const userData = userDataArray[0];

      // Add the user the first time
      const { isNewUser } = await users.addOrUpdate(userData);

      // Update the user with same data
      const { isNewUser: updatedIsNewUserFlag } = await users.addOrUpdate(userData);

      expect(isNewUser).to.equal(true);
      expect(updatedIsNewUserFlag).to.equal(false);
    });

    it("should update the user collection when userId is passed", async function () {
      const userData1 = userDataArray[0];
      const userData2 = userDataArray[1];
      const updatedUserData = {};

      Object.assign(updatedUserData, userData1, userData2);

      // Add the user the first time
      const { isNewUser, userId } = await users.addOrUpdate(userData1);

      // Update the user with same data
      const { isNewUser: updatedIsNewUserFlag } = await users.addOrUpdate(userData2, userId);

      const data = (await userModel.doc(userId).get()).data();

      Object.keys(updatedUserData).forEach((key) => {
        expect(updatedUserData[key]).to.deep.equal(data[key]);
      });

      expect(isNewUser).to.equal(true);
      expect(updatedIsNewUserFlag).to.equal(false);
    });

    it("should return the user information when github username is passed", async function () {
      const userData = userDataArray[0];
      await users.addOrUpdate(userData);
      const githubUsername = "ankur";
      const { user, userExists } = await users.fetchUser({ githubUsername });
      expect(user).to.haveOwnProperty("id");
      expect(user).to.haveOwnProperty("username");
      expect(user).to.haveOwnProperty("first_name");
      expect(user).to.haveOwnProperty("last_name");

      expect(user.first_name).to.equal(userData.first_name);
      expect(user.last_name).to.equal(userData.last_name);
      expect(userExists).to.equal(true);
    });
  });

  describe(" search users API: getUsersBasedOnFilter", function () {
    it("should return an empty array if no query is provided", async function () {
      const result = await users.getUsersBasedOnFilter({});
      expect(result).to.deep.equal([]);
    });

    it("should return an array of verified users", async function () {
      const result = await users.getUsersBasedOnFilter({ verified: "true" });
      expect(result).to.deep.equal(userDataArray.filter((user) => user.discordId));
    });
  });

  describe("fetchAllUsers", function () {
    beforeEach(async function () {
      const addUsersPromises = [];
      userDataArray.forEach((user) => {
        addUsersPromises.push(userModel.add(user));
      });
      await Promise.all(addUsersPromises);
    });

    it("gets all users from user model", async function () {
      const result = await users.fetchAllUsers();
      expect(result).to.have.length(userDataArray.length);
    });
  });
});
