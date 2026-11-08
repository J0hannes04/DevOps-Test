package com.example.demo;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;

import tools.jackson.databind.ObjectMapper;

@WebMvcTest(AuthController.class)
class AuthValidationWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @Test
    void shouldRejectUsernameThatIsTooShort() throws Exception {
        RegisterRequest request = registerRequest("ab", "user@example.com", "password123");

        performRegister(request);
    }

    @Test
    void shouldRejectUsernameWithInvalidCharacters() throws Exception {
        RegisterRequest request = registerRequest("user name", "user@example.com", "password123");

        performRegister(request);
    }

    @Test
    void shouldRejectEmptyRequiredFields() throws Exception {
        RegisterRequest request = registerRequest("", "", "");

        performRegister(request);
    }

    @Test
    void shouldRejectInvalidEmailAddress() throws Exception {
        RegisterRequest request = registerRequest("valid-user", "not-an-email", "password123");

        performRegister(request);
    }

    @Test
    void shouldRejectPasswordThatIsTooShort() throws Exception {
        RegisterRequest request = registerRequest("valid-user", "user@example.com", "short");

        performRegister(request);
    }

    @Test
    void shouldRejectPasswordThatIsTooLong() throws Exception {
        RegisterRequest request = registerRequest(
            "valid-user",
            "user@example.com",
            "a".repeat(73)
        );

        performRegister(request);
    }

    @Test
    void shouldRejectLoginWithEmptyRequiredFields() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setUsername("");
        request.setPassword("");

        mockMvc.perform(post("/api/auth/login")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());

        verifyNoInteractions(userRepository);
    }

    @Test
    void shouldRejectLoginPasswordThatIsTooLong() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setUsername("valid-user");
        request.setPassword("a".repeat(73));

        mockMvc.perform(post("/api/auth/login")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());

        verifyNoInteractions(userRepository);
    }

    private void performRegister(RegisterRequest request) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());

        verifyNoInteractions(userRepository);
    }

    private RegisterRequest registerRequest(String username, String email, String password) {
        RegisterRequest request = new RegisterRequest();
        request.setUsername(username);
        request.setEmail(email);
        request.setPassword(password);
        return request;
    }
}
