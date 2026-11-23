package com.example.freetemposerver.controller;

import jakarta.servlet.http.HttpSession;

public final class AdminSession {

    public static final String ATTRIBUTE = "adminAuthenticated";

    private AdminSession() {
    }

    public static boolean isAuthenticated(HttpSession session) {
        return session != null && Boolean.TRUE.equals(session.getAttribute(ATTRIBUTE));
    }
}
