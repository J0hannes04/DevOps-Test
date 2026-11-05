package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    public ResponseEntity<String> registerUser(@Valid @RequestBody RegisterRequest request) {
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
        
        return ResponseEntity.ok("Erfolgreich registriert!");
    }

    @PostMapping("/login")
    public ResponseEntity<String> loginUser(@Valid @RequestBody LoginRequest loginData) {
        User user = userRepository.findByUsername(loginData.getUsername());

        // Prüfen, ob der Benutzer existiert
        if (user == null) {
            return ResponseEntity.badRequest().body("Benutzer nicht gefunden!");
        }

        // Passwort vergleichen (Klartext vs. verschlüsselter Hash)
        if (!passwordEncoder.matches(loginData.getPassword(), user.getPassword())) {
            return ResponseEntity.badRequest().body("Falsches Passwort!");
        }

        return ResponseEntity.ok("Erfolgreich eingeloggt!");
    }

   @PutMapping("/update")
    public ResponseEntity<?> updateUser(@Valid @RequestBody UpdateRequest request) {
        // 1. User anhand des aktuellen Namens suchen (angepasst an dein Repository)
        User user = userRepository.findByUsername(request.getCurrentUsername());
        
        if (user != null) {
            // 2. Nur aktualisieren, wenn ein neuer Wert mitgeschickt wurde
            if (request.getNewUsername() != null && !request.getNewUsername().isEmpty()) {
                user.setUsername(request.getNewUsername());
            }
            if (request.getNewEmail() != null && !request.getNewEmail().isEmpty()) {
                user.setEmail(request.getNewEmail());
            }
            
            // 3. Speichern
            userRepository.save(user);
            return ResponseEntity.ok("Profil erfolgreich aktualisiert!");
        } else {
            return ResponseEntity.badRequest().body("Benutzer nicht gefunden.");
        }
    }
    
}
