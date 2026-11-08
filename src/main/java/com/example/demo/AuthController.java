package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.beans.factory.annotation.Autowired;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginRateLimiter loginRateLimiter;

    @Autowired
    public AuthController(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        LoginRateLimiter loginRateLimiter
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.loginRateLimiter = loginRateLimiter;
    }

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this(userRepository, passwordEncoder, new LoginRateLimiter());
    }

    @PostMapping("/register")
    public ResponseEntity<String> registerUser(
        @Valid @RequestBody RegisterRequest request,
        HttpServletRequest httpRequest
    ) {
        if (userRepository.findByUsername(request.getUsername()) != null) {
            return ResponseEntity.badRequest().body("Benutzername existiert bereits!");
        }
        if (userRepository.findByEmail(request.getEmail()) != null) {
            return ResponseEntity.badRequest().body("E-Mail-Adresse existiert bereits!");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);
        authenticateSession(httpRequest, user.getUsername());

        return ResponseEntity.ok("Erfolgreich registriert!");
    }

    @PostMapping("/login")
    public ResponseEntity<String> loginUser(
        @Valid @RequestBody LoginRequest loginData,
        HttpServletRequest httpRequest
    ) {
        String rateLimitKey = buildRateLimitKey(httpRequest, loginData.getUsername());
        if (!loginRateLimiter.isAllowed(rateLimitKey)) {
            return ResponseEntity.status(429).body("Zu viele Login-Versuche. Bitte später erneut versuchen.");
        }

        User user = userRepository.findByUsername(loginData.getUsername());

        if (user == null || !passwordEncoder.matches(loginData.getPassword(), user.getPassword())) {
            loginRateLimiter.recordFailure(rateLimitKey);
            return ResponseEntity.badRequest().body("Ungültige Zugangsdaten.");
        }

        loginRateLimiter.reset(rateLimitKey);
        authenticateSession(httpRequest, user.getUsername());
        return ResponseEntity.ok("Erfolgreich eingeloggt!");
    }

    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf(CsrfToken ignoredToken) {
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthUserResponse> currentUser(@AuthenticationPrincipal String username) {
        User user = userRepository.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(new AuthUserResponse(user.getUsername(), user.getEmail()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/update")
    public ResponseEntity<?> updateUser(
        @Valid @RequestBody UpdateRequest request,
        @AuthenticationPrincipal String username,
        HttpServletRequest httpRequest
    ) {
        User user = userRepository.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(401).body("Nicht authentifiziert.");
        }

        if (request.getNewUsername() != null && !request.getNewUsername().isBlank()) {
            User existingUsername = userRepository.findByUsername(request.getNewUsername());
            if (existingUsername != null && !existingUsername.getId().equals(user.getId())) {
                return ResponseEntity.badRequest().body("Benutzername existiert bereits!");
            }
            user.setUsername(request.getNewUsername());
        }
        if (request.getNewEmail() != null && !request.getNewEmail().isBlank()) {
            User existingEmail = userRepository.findByEmail(request.getNewEmail());
            if (existingEmail != null && !existingEmail.getId().equals(user.getId())) {
                return ResponseEntity.badRequest().body("E-Mail-Adresse existiert bereits!");
            }
            user.setEmail(request.getNewEmail());
        }

        userRepository.save(user);
        authenticateSession(httpRequest, user.getUsername());
        return ResponseEntity.ok("Profil erfolgreich aktualisiert!");
    }

    private void authenticateSession(HttpServletRequest request, String username) {
        HttpSession session = request.getSession(true);
        request.changeSessionId();
        session.setAttribute(SessionAuthenticationFilter.SESSION_USERNAME, username);
    }

    private String buildRateLimitKey(HttpServletRequest request, String username) {
        String client = request.getRemoteAddr();
        return client + ":" + username.toLowerCase(java.util.Locale.ROOT);
    }
}
