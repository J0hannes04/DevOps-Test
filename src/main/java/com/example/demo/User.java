package com.example.demo;

import jakarta.persistence.*;
import java.util.Base64;
import java.security.SecureRandom;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(unique = true, nullable = false)
    private String email; // Neues E-Mail Feld

    @Column(nullable = false)
    private String password;

    @Column(name = "vault_salt", length = 64)
    private String vaultSalt;

    @Lob
    @Column(name = "vault_verifier", length = 2000)
    private String vaultVerifier;

    @Column(name = "vault_verifier_iv", length = 64)
    private String vaultVerifierIv;

    public String getVaultSalt() {
        if (vaultSalt == null || vaultSalt.isBlank()) {
            byte[] salt = new byte[32];
            new SecureRandom().nextBytes(salt);
            vaultSalt = Base64.getEncoder().encodeToString(salt);
        }
        return vaultSalt;
    }

    public void setVaultSalt(String vaultSalt) { this.vaultSalt = vaultSalt; }
    public String getVaultVerifier() { return vaultVerifier; }
    public void setVaultVerifier(String vaultVerifier) { this.vaultVerifier = vaultVerifier; }
    public String getVaultVerifierIv() { return vaultVerifierIv; }
    public void setVaultVerifierIv(String vaultVerifierIv) { this.vaultVerifierIv = vaultVerifierIv; }

    // Getter und Setter
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}