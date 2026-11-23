package com.example.freetemposerver.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public String handleMaxUploadSize(MaxUploadSizeExceededException e,
                                      RedirectAttributes redirectAttributes) {
        redirectAttributes.addFlashAttribute("error", "파일 크기가 허용 용량(20MB)을 초과했습니다.");
        return "redirect:/midi";
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public String handleIllegalArgument(IllegalArgumentException e,
                                        RedirectAttributes redirectAttributes) {
        redirectAttributes.addFlashAttribute("error", e.getMessage());
        return "redirect:/midi";
    }

    @ExceptionHandler(IllegalStateException.class)
    public String handleIllegalState(IllegalStateException e,
                                     RedirectAttributes redirectAttributes) {
        log.error("파일 처리 중 오류가 발생했습니다.", e);
        redirectAttributes.addFlashAttribute("error", e.getMessage());
        return "redirect:/midi";
    }
}
