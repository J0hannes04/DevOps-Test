package com.example.demo;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class SessionAuthenticationFilter extends OncePerRequestFilter {

    static final String SESSION_USERNAME = "authenticatedUsername";

    private final UserRepository userRepository;

    public SessionAuthenticationFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        if (session != null) {
            String username = (String) session.getAttribute(SESSION_USERNAME);
            if (username != null) {
                User user = userRepository.findByUsername(username);
                if (user != null) {
                    var authentication = new UsernamePasswordAuthenticationToken(
                        user.getUsername(),
                        null,
                        java.util.List.of()
                    );
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } else {
                    session.invalidate();
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
