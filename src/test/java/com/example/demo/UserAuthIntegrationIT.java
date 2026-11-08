package com.example.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class UserAuthIntegrationIT {

    @Container
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @DynamicPropertySource
    static void configureDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
    }

    @BeforeEach
    void cleanDatabase() {
        userRepository.deleteAll();
    }

    @Test
    void shouldRegisterUserAndPersistHashedPassword() throws Exception {
        RegisterRequest request = registerRequest("integration-user", "integration@example.com", "password123");

        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(content().string("Erfolgreich registriert!"));

        User savedUser = userRepository.findByUsername("integration-user");
        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getEmail()).isEqualTo("integration@example.com");
        assertThat(savedUser.getPassword()).isNotEqualTo("password123");
        assertThat(passwordEncoder.matches("password123", savedUser.getPassword())).isTrue();
    }

    @Test
    void shouldLoginWithPersistedUser() throws Exception {
        RegisterRequest registration = registerRequest("login-user", "login@example.com", "password123");
        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(registration)))
            .andExpect(status().isOk());

        LoginRequest login = new LoginRequest();
        login.setUsername("login-user");
        login.setPassword("password123");

        mockMvc.perform(post("/api/auth/login")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(login)))
            .andExpect(status().isOk())
            .andExpect(content().string("Erfolgreich eingeloggt!"));
    }

    @Test
    void shouldRejectDuplicateUsernameFromDatabase() throws Exception {
        RegisterRequest first = registerRequest("duplicate-user", "first@example.com", "password123");
        RegisterRequest second = registerRequest("duplicate-user", "second@example.com", "password123");

        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(first)))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(second)))
            .andExpect(status().isBadRequest())
            .andExpect(content().string("Benutzername existiert bereits!"));

        assertThat(userRepository.count()).isEqualTo(1);
    }

    @Test
    void shouldRejectDuplicateEmailFromDatabase() throws Exception {
        RegisterRequest first = registerRequest("first-user", "duplicate@example.com", "password123");
        RegisterRequest second = registerRequest("second-user", "duplicate@example.com", "password123");

        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(first)))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(second)))
            .andExpect(status().isBadRequest())
            .andExpect(content().string("E-Mail-Adresse existiert bereits!"));

        assertThat(userRepository.count()).isEqualTo(1);
    }

    private RegisterRequest registerRequest(String username, String email, String password) {
        RegisterRequest request = new RegisterRequest();
        request.setUsername(username);
        request.setEmail(email);
        request.setPassword(password);
        return request;
    }
}
