package com.example.freetemposerver.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "midi_file")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MidiFile {

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 200)
    private String artist;

    @Column(nullable = false, length = 255)
    private String originalFilename;

    @Column(nullable = false, unique = true, length = 255)
    private String storedFilename;

    @Column(length = 100)
    private String contentType;

    @Column(nullable = false)
    private Long fileSize;

    @Column(nullable = false)
    private long downloadCount;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (downloadCount < 0) {
            downloadCount = 0;
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public String getFileSizeText() {
        if (fileSize == null) {
            return "-";
        }
        if (fileSize < 1024) {
            return fileSize + " B";
        }
        double kiloBytes = fileSize / 1024.0;
        if (kiloBytes < 1024) {
            return String.format(Locale.KOREA, "%.1f KB", kiloBytes);
        }
        return String.format(Locale.KOREA, "%.1f MB", kiloBytes / 1024);
    }

    public String getCreatedAtText() {
        return createdAt == null ? "" : createdAt.format(DATE_FORMATTER);
    }
}
