package com.example.demo; // Passe dein Package an, falls es anders heißt!

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class UpdateRequest {
    @NotBlank
    @Size(max = 50)
    private String currentUsername;

    @Size(min = 3, max = 50)
    @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "Benutzername enthält ungültige Zeichen")
    private String newUsername;

    @Email(message = "Ungültige E-Mail-Adresse")
    @Size(max = 254)
    private String newEmail;

    // Getter und Setter
    public String getCurrentUsername() { return currentUsername; }
    public void setCurrentUsername(String currentUsername) { this.currentUsername = currentUsername; }

    public String getNewUsername() { return newUsername; }
    public void setNewUsername(String newUsername) { this.newUsername = newUsername; }

    public String getNewEmail() { return newEmail; }
    public void setNewEmail(String newEmail) { this.newEmail = newEmail; }
}