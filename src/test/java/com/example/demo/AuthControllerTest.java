package com.example.demo;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private HttpServletRequest httpRequest;

    @Mock
    private HttpSession httpSession;

    private AuthController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new AuthController(userRepository, passwordEncoder);
        org.mockito.Mockito.when(httpRequest.getSession(true)).thenReturn(httpSession);
    }

    @Test
    void shouldRegisterUserWithEncodedPassword() {
        RegisterRequest request = registerRequest("johannes", "johannes@example.com", "password123");
        when(userRepository.findByUsername("johannes")).thenReturn(null);
        when(userRepository.findByEmail("johannes@example.com")).thenReturn(null);
        when(passwordEncoder.encode("password123")).thenReturn("encoded-password");

        var response = controller.registerUser(request, httpRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Erfolgreich registriert!", response.getBody());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertEquals("johannes", savedUser.getUsername());
        assertEquals("johannes@example.com", savedUser.getEmail());
        assertEquals("encoded-password", savedUser.getPassword());
    }

    @Test
    void shouldRejectDuplicateUsername() {
        RegisterRequest request = registerRequest("johannes", "new@example.com", "password123");
        User existingUser = new User();
        existingUser.setUsername("johannes");
        when(userRepository.findByUsername("johannes")).thenReturn(existingUser);

        var response = controller.registerUser(request, httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Benutzername existiert bereits!", response.getBody());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldRejectDuplicateEmail() {
        RegisterRequest request = registerRequest("new-user", "johannes@example.com", "password123");
        User existingUser = new User();
        existingUser.setEmail("johannes@example.com");
        when(userRepository.findByUsername("new-user")).thenReturn(null);
        when(userRepository.findByEmail("johannes@example.com")).thenReturn(existingUser);

        var response = controller.registerUser(request, httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("E-Mail-Adresse existiert bereits!", response.getBody());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldLoginWithCorrectPassword() {
        LoginRequest request = loginRequest("johannes", "password123");
        User user = new User();
        user.setUsername("johannes");
        user.setPassword("encoded-password");
        when(userRepository.findByUsername("johannes")).thenReturn(user);
        when(passwordEncoder.matches("password123", "encoded-password")).thenReturn(true);

        var response = controller.loginUser(request, httpRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Erfolgreich eingeloggt!", response.getBody());
    }

    @Test
    void shouldRejectIncorrectPassword() {
        LoginRequest request = loginRequest("johannes", "wrong-password");
        User user = new User();
        user.setUsername("johannes");
        user.setPassword("encoded-password");
        when(userRepository.findByUsername("johannes")).thenReturn(user);
        when(passwordEncoder.matches("wrong-password", "encoded-password")).thenReturn(false);

        var response = controller.loginUser(request, httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Ungültige Zugangsdaten.", response.getBody());
    }

    @Test
    void shouldRejectUnknownUser() {
        LoginRequest request = loginRequest("unknown", "password123");
        when(userRepository.findByUsername("unknown")).thenReturn(null);

        var response = controller.loginUser(request, httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Ungültige Zugangsdaten.", response.getBody());
        verify(passwordEncoder, never()).matches(any(String.class), any(String.class));
    }

    private RegisterRequest registerRequest(String username, String email, String password) {
        RegisterRequest request = new RegisterRequest();
        request.setUsername(username);
        request.setEmail(email);
        request.setPassword(password);
        return request;
    }

    private LoginRequest loginRequest(String username, String password) {
        LoginRequest request = new LoginRequest();
        request.setUsername(username);
        request.setPassword(password);
        return request;
    }
}
