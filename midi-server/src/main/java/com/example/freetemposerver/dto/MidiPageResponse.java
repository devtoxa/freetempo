package com.example.freetemposerver.dto;

import java.util.List;

public record MidiPageResponse(
        List<MidiFileResponse> content,
        int page,
        int totalPages,
        long totalItems
) {
}
