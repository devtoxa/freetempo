package com.example.freetemposerver.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/admin")
public class AdminController {

    private final String adminPassword;

    public AdminController(@Value("${app.admin.password}") String adminPassword) {
        this.adminPassword = adminPassword;
    }

    @PostMapping("/login")
    public String login(@RequestParam(defaultValue = "") String password,
                        HttpSession session,
                        RedirectAttributes redirectAttributes) {
        if (password.equals(adminPassword)) {
            session.setAttribute(AdminSession.ATTRIBUTE, Boolean.TRUE);
            redirectAttributes.addFlashAttribute("message", "관리자로 로그인되었습니다.");
        } else {
            redirectAttributes.addFlashAttribute("error", "관리자 비밀번호가 올바르지 않습니다.");
        }
        return "redirect:/midi";
    }

    @PostMapping("/logout")
    public String logout(HttpSession session, RedirectAttributes redirectAttributes) {
        session.removeAttribute(AdminSession.ATTRIBUTE);
        redirectAttributes.addFlashAttribute("message", "로그아웃되었습니다.");
        return "redirect:/midi";
    }
}
