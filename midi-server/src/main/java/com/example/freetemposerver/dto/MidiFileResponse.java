package com.example.freetemposerver.dto;

import com.example.freetemposerver.domain.MidiFile;

public record MidiFileResponse(
        Long id,
        String title,
        String artist,
        String originalFilename,
        String contentType,
        Long fileSize,
        String fileSizeText,
        long downloadCount,
        String createdAtText
) {

    public static MidiFileResponse from(MidiFile file) {
        return new MidiFileResponse(
                file.getId(),
                file.getTitle(),
                file.getArtist(),
                file.getOriginalFilename(),
                file.getContentType(),
                file.getFileSize(),
                file.getFileSizeText(),
                file.getDownloadCount(),
                file.getCreatedAtText()
        );
    }
}
