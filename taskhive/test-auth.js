// Simple test script to verify API connectivity
import { authApi } from "../src/lib/api";

async function testAuth() {
  console.log("Testing authentication API...");

  // Test registration
  try {
    const registerResponse = await authApi.register({
      user_id: "test_user",
      email: "test@example.com",
      password: "testpassword123",
    });

    console.log("Registration test:", registerResponse);

    // Test login
    const loginResponse = await authApi.login({
      user_id: "test_user",
      password: "testpassword123",
    });

    console.log("Login test:", loginResponse);
  } catch (error) {
    console.error("Error testing auth:", error);
  }
}

testAuth();
