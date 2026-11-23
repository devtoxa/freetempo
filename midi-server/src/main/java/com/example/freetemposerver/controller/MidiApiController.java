package com.example.freetemposerver.controller;

import com.example.freetemposerver.domain.MidiFile;
import com.example.freetemposerver.dto.MidiFileResponse;
import com.example.freetemposerver.dto.MidiPageResponse;
import com.example.freetemposerver.service.MidiService;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 통합 페이지에서 사용하는 읽기 전용 MIDI JSON API.
 * 기존 Thymeleaf 게시판 기능은 그대로 유지된다.
 */
@RestController
@RequestMapping("/api/midi")
public class MidiApiController {

    private final MidiService midiService;

    public MidiApiController(MidiService midiService) {
        this.midiService = midiService;
    }

    @GetMapping
    public MidiPageResponse list(@RequestParam(defaultValue = "") String keyword,
                                 @RequestParam(defaultValue = "0") int page) {
        Page<MidiFile> files = midiService.getPage(keyword, page);
        List<MidiFileResponse> content = files.getContent().stream()
                .map(MidiFileResponse::from)
                .toList();
        return new MidiPageResponse(
                content,
                files.getNumber(),
                files.getTotalPages(),
                files.getTotalElements()
        );
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> file(@PathVariable Long id) {
        MidiService.DownloadFile download = midiService.open(id);
        MidiFile metadata = download.metadata();

        ContentDisposition disposition = ContentDisposition.inline()
                .filename(metadata.getOriginalFilename(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType("audio/midi"))
                .contentLength(metadata.getFileSize())
                .body(download.resource());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(new ApiError(e.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiError> handleIllegalState(IllegalStateException e) {
        return ResponseEntity.internalServerError().body(new ApiError(e.getMessage()));
    }

    public record ApiError(String error) {
    }
}
