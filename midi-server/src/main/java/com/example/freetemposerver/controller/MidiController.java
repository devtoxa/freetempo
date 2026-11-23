package com.example.freetemposerver.controller;

import com.example.freetemposerver.domain.MidiFile;
import com.example.freetemposerver.dto.MidiUploadForm;
import com.example.freetemposerver.service.MidiService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.IntStream;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class MidiController {

    private static final int PAGE_WINDOW = 5;

    private final MidiService midiService;

    public MidiController(MidiService midiService) {
        this.midiService = midiService;
    }

    @GetMapping("/")
    public String index() {
        return "redirect:/midi";
    }

    @GetMapping("/midi")
    public String list(@RequestParam(defaultValue = "") String keyword,
                       @RequestParam(defaultValue = "0") int page,
                       HttpSession session,
                       Model model) {
        Page<MidiFile> files = midiService.getPage(keyword, page);

        model.addAttribute("admin", AdminSession.isAuthenticated(session));
        model.addAttribute("files", files);
        model.addAttribute("keyword", keyword);
        model.addAttribute("currentPage", files.getNumber());
        model.addAttribute("totalPages", files.getTotalPages());
        model.addAttribute("totalItems", files.getTotalElements());
        model.addAttribute("pageNumbers", pageNumbers(files.getNumber(), files.getTotalPages()));
        model.addAttribute("uploadForm", new MidiUploadForm());
        return "midi/list";
    }

    @PostMapping("/midi/upload")
    public String upload(@Valid @ModelAttribute("uploadForm") MidiUploadForm form,
                         BindingResult bindingResult,
                         RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            redirectAttributes.addFlashAttribute("error",
                    bindingResult.getAllErrors().get(0).getDefaultMessage());
            return "redirect:/midi";
        }

        try {
            midiService.upload(form.getTitle(), form.getArtist(), form.getFile());
            redirectAttributes.addFlashAttribute("message", "MIDI 파일이 등록되었습니다.");
        } catch (IllegalArgumentException | IllegalStateException e) {
            redirectAttributes.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/midi";
    }

    @GetMapping("/midi/download/{id}")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        MidiService.DownloadFile download = midiService.load(id);
        MidiFile metadata = download.metadata();

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(metadata.getOriginalFilename(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType("audio/midi"))
                .contentLength(metadata.getFileSize())
                .body(download.resource());
    }

    @PostMapping("/midi/{id}/delete")
    public String delete(@PathVariable Long id,
                         HttpSession session,
                         RedirectAttributes redirectAttributes) {
        if (!AdminSession.isAuthenticated(session)) {
            redirectAttributes.addFlashAttribute("error", "삭제는 관리자만 가능합니다.");
            return "redirect:/midi";
        }
        try {
            midiService.delete(id);
            redirectAttributes.addFlashAttribute("message", "삭제되었습니다.");
        } catch (IllegalArgumentException | IllegalStateException e) {
            redirectAttributes.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/midi";
    }

    private List<Integer> pageNumbers(int currentPage, int totalPages) {
        if (totalPages <= 0) {
            return List.of();
        }
        int end = Math.min(totalPages, currentPage + PAGE_WINDOW);
        int start = Math.max(0, end - PAGE_WINDOW);
        return IntStream.range(start, end).boxed().toList();
    }
}
