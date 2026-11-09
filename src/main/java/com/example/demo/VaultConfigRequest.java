package com.example.demo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class VaultConfigRequest {

    @NotBlank
    @Size(max = 2000)
    private String verifier;

    @NotBlank
    @Pattern(regexp = "^[A-Za-z0-9+/]+={0,2}$")
    private String verifierIv;

    public String getVerifier() { return verifier; }
    public void setVerifier(String verifier) { this.verifier = verifier; }
    public String getVerifierIv() { return verifierIv; }
    public void setVerifierIv(String verifierIv) { this.verifierIv = verifierIv; }
}
