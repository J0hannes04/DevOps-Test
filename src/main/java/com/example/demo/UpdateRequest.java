package com.example.demo; // Passe dein Package an, falls es anders heißt!

public class UpdateRequest {
    private String currentUsername;
    private String newUsername;
    private String newEmail;

    // Getter und Setter
    public String getCurrentUsername() { return currentUsername; }
    public void setCurrentUsername(String currentUsername) { this.currentUsername = currentUsername; }

    public String getNewUsername() { return newUsername; }
    public void setNewUsername(String newUsername) { this.newUsername = newUsername; }

    public String getNewEmail() { return newEmail; }
    public void setNewEmail(String newEmail) { this.newEmail = newEmail; }
}