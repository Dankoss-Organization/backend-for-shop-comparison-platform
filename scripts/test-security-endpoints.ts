/**
 * Integration Test Script for Security Endpoints
 *
 * Run with: ts-node scripts/test-security-endpoints.ts
 *
 * This script tests the three new security endpoints:
 * 1. PUT /auth/change-password
 * 2. GET /auth/sessions
 * 3. DELETE /auth/sessions/:id
 */

import axios, { AxiosError } from "axios";

const API_BASE_URL = process.env.API_URL || "http://localhost:3000";

interface TestResult {
  name: string;
  status: "✓" | "✗";
  message: string;
}

const results: TestResult[] = [];

async function runTests() {
  console.log("🔐 Testing Security Endpoints\n");
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  // Test 1: Register a test user
  console.log("1️⃣  Creating test user...");
  let userId: string;
  let sessionToken: string;

  try {
    const signUpResponse = await axios.post(`${API_BASE_URL}/auth/signup`, {
      email: `test-${Date.now()}@example.com`,
      password: "TestPassword123",
      name: "Test User",
    });

    userId = signUpResponse.data.user.id;
    results.push({
      name: "User Registration",
      status: "✓",
      message: "Test user created successfully",
    });
  } catch (error) {
    results.push({
      name: "User Registration",
      status: "✗",
      message: `Failed to create test user: ${
        (error as AxiosError).response?.status
      }`,
    });
    printResults();
    return;
  }

  // Test 2: Sign in to get token
  console.log("\n2️⃣  Signing in...");
  try {
    const signInResponse = await axios.post(`${API_BASE_URL}/auth/signin`, {
      email: signUpResponse.data.user.email,
      password: "TestPassword123",
    });

    sessionToken = signInResponse.data.token;
    results.push({
      name: "User Sign In",
      status: "✓",
      message: "User signed in successfully, token obtained",
    });
  } catch (error) {
    results.push({
      name: "User Sign In",
      status: "✗",
      message: `Failed to sign in: ${(error as AxiosError).response?.status}`,
    });
    printResults();
    return;
  }

  // Test 3: GET /auth/sessions - Check initial sessions
  console.log("\n3️⃣  Fetching sessions before changes...");
  let initialSessionCount = 0;
  try {
    const sessionsResponse = await axios.get(`${API_BASE_URL}/auth/sessions`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    initialSessionCount = sessionsResponse.data.sessions.length;
    results.push({
      name: "GET /auth/sessions",
      status: "✓",
      message: `Retrieved ${initialSessionCount} session(s)`,
    });
  } catch (error) {
    results.push({
      name: "GET /auth/sessions",
      status: "✗",
      message: `Failed to fetch sessions: ${(error as AxiosError).response?.status}`,
    });
  }

  // Test 4: PUT /auth/change-password - Success case
  console.log("\n4️⃣  Testing password change (success)...");
  try {
    await axios.put(
      `${API_BASE_URL}/auth/change-password`,
      {
        currentPassword: "TestPassword123",
        newPassword: "NewPassword456",
      },
      { headers: { Authorization: `Bearer ${sessionToken}` } },
    );

    results.push({
      name: "PUT /auth/change-password (Success)",
      status: "✓",
      message: "Password changed successfully",
    });
  } catch (error) {
    results.push({
      name: "PUT /auth/change-password (Success)",
      status: "✗",
      message: `Failed to change password: ${(error as AxiosError).response?.status}`,
    });
  }

  // Test 5: PUT /auth/change-password - Failure case (wrong current password)
  console.log("\n5️⃣  Testing password change (wrong current password)...");
  try {
    await axios.put(
      `${API_BASE_URL}/auth/change-password`,
      {
        currentPassword: "WrongPassword",
        newPassword: "AnotherPassword789",
      },
      { headers: { Authorization: `Bearer ${sessionToken}` } },
    );

    results.push({
      name: "PUT /auth/change-password (Wrong Password)",
      status: "✗",
      message: "Should have thrown an error for wrong password",
    });
  } catch (error) {
    if ((error as AxiosError).response?.status === 401) {
      results.push({
        name: "PUT /auth/change-password (Wrong Password)",
        status: "✓",
        message: "Correctly rejected wrong password with 401",
      });
    } else {
      results.push({
        name: "PUT /auth/change-password (Wrong Password)",
        status: "✗",
        message: `Unexpected error: ${(error as AxiosError).response?.status}`,
      });
    }
  }

  // Test 6: Verify password change by signing in with new password
  console.log(
    "\n6️⃣  Verifying password change by signing in with new password...",
  );
  try {
    const newSignInResponse = await axios.post(`${API_BASE_URL}/auth/signin`, {
      email: signUpResponse.data.user.email,
      password: "NewPassword456",
    });

    results.push({
      name: "Sign In With New Password",
      status: "✓",
      message: "Successfully signed in with new password",
    });
  } catch (error) {
    results.push({
      name: "Sign In With New Password",
      status: "✗",
      message: `Failed to sign in with new password: ${
        (error as AxiosError).response?.status
      }`,
    });
  }

  // Test 7: DELETE /auth/sessions/:id - Get session id first
  console.log("\n7️⃣  Testing session deletion...");
  try {
    const sessionsResponse = await axios.get(`${API_BASE_URL}/auth/sessions`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    if (sessionsResponse.data.sessions.length > 0) {
      const sessionIdToDelete = sessionsResponse.data.sessions[0].id;

      // Delete the session
      await axios.delete(`${API_BASE_URL}/auth/sessions/${sessionIdToDelete}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });

      results.push({
        name: "DELETE /auth/sessions/:id",
        status: "✓",
        message: "Session deleted successfully",
      });
    } else {
      results.push({
        name: "DELETE /auth/sessions/:id",
        status: "✗",
        message: "No sessions available to delete",
      });
    }
  } catch (error) {
    results.push({
      name: "DELETE /auth/sessions/:id",
      status: "✗",
      message: `Failed to delete session: ${(error as AxiosError).response?.status}`,
    });
  }

  // Test 8: DELETE /auth/sessions/:id - Failure case (invalid session)
  console.log("\n8️⃣  Testing session deletion with invalid session ID...");
  try {
    await axios.delete(
      `${API_BASE_URL}/auth/sessions/invalid-session-id-12345`,
      { headers: { Authorization: `Bearer ${sessionToken}` } },
    );

    results.push({
      name: "DELETE /auth/sessions/:id (Invalid ID)",
      status: "✗",
      message: "Should have thrown an error for invalid session ID",
    });
  } catch (error) {
    if ((error as AxiosError).response?.status === 401) {
      results.push({
        name: "DELETE /auth/sessions/:id (Invalid ID)",
        status: "✓",
        message: "Correctly rejected invalid session ID with 401",
      });
    } else {
      results.push({
        name: "DELETE /auth/sessions/:id (Invalid ID)",
        status: "✗",
        message: `Unexpected error: ${(error as AxiosError).response?.status}`,
      });
    }
  }

  printResults();
}

function printResults() {
  console.log("\n" + "=".repeat(60));
  console.log("📋 Test Results\n");

  let passCount = 0;
  let failCount = 0;

  results.forEach((result) => {
    const icon = result.status === "✓" ? "✅" : "❌";
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}\n`);

    if (result.status === "✓") passCount++;
    else failCount++;
  });

  console.log("=".repeat(60));
  console.log(
    `\n📊 Summary: ${passCount} passed, ${failCount} failed out of ${results.length} tests\n`,
  );

  process.exit(failCount > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
