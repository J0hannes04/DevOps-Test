package com.example.demo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class VaultItemRequest {

    @NotBlank
    @Size(max = 50)
    @Pattern(regexp = "^[a-zA-Z0-9 &-]+$")
    private String category;

    @NotBlank
    @Size(max = 2_000_000)
    private String ciphertext;

    @NotBlank
    @Pattern(regexp = "^[A-Za-z0-9+/]+={0,2}$")
    private String iv;

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getCiphertext() { return ciphertext; }
    public void setCiphertext(String ciphertext) { this.ciphertext = ciphertext; }
    public String getIv() { return iv; }
    public void setIv(String iv) { this.iv = iv; }
}
