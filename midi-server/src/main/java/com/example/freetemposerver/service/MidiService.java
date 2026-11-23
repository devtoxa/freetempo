package com.example.freetemposerver.service;

import com.example.freetemposerver.domain.MidiFile;
import com.example.freetemposerver.repository.MidiFileRepository;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MidiService {

    public static final int PAGE_SIZE = 10;

    private static final Logger log = LoggerFactory.getLogger(MidiService.class);
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("mid", "midi");

    private final MidiFileRepository repository;
    private final Path rootDir;

    public MidiService(MidiFileRepository repository, @Value("${app.upload.dir}") String uploadDir) {
        this.repository = repository;
        this.rootDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Transactional
    public MidiFile upload(String title, String artist, MultipartFile file) {
        if (!StringUtils.hasText(title) || !StringUtils.hasText(artist)) {
            throw new IllegalArgumentException("제목과 아티스트를 모두 입력해 주세요.");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("MIDI 파일을 선택해 주세요.");
        }

        String originalFilename = sanitizeFilename(file.getOriginalFilename());
        String extension = getExtension(originalFilename);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("MIDI 파일(.mid, .midi)만 업로드할 수 있습니다.");
        }

        String storedFilename = UUID.randomUUID().toString().replace("-", "") + "." + extension;

        try {
            Files.createDirectories(rootDir);
            Path target = rootDir.resolve(storedFilename).normalize();
            file.transferTo(target);

            MidiFile entity = MidiFile.builder()
                    .title(title.trim())
                    .artist(artist.trim())
                    .originalFilename(originalFilename)
                    .storedFilename(storedFilename)
                    .contentType(file.getContentType())
                    .fileSize(file.getSize())
                    .downloadCount(0)
                    .build();
            return repository.save(entity);
        } catch (IOException e) {
            throw new IllegalStateException("MIDI 파일을 저장하는 중 오류가 발생했습니다.", e);
        }
    }

    @Transactional(readOnly = true)
    public Page<MidiFile> getPage(String keyword, int page) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                PAGE_SIZE,
                Sort.by(Sort.Direction.DESC, "createdAt", "id"));

        if (!StringUtils.hasText(keyword)) {
            return repository.findAll(pageable);
        }
        String searchKeyword = keyword.trim();
        return repository.findByTitleContainingIgnoreCaseOrArtistContainingIgnoreCase(
                searchKeyword, searchKeyword, pageable);
    }

    @Transactional
    public DownloadFile load(Long id) {
        MidiFile metadata = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 파일입니다."));

        Path path = rootDir.resolve(metadata.getStoredFilename()).normalize();
        if (!path.startsWith(rootDir) || !Files.exists(path)) {
            throw new IllegalArgumentException("저장된 파일을 찾을 수 없습니다.");
        }

        Resource resource;
        try {
            resource = new UrlResource(path.toUri());
        } catch (MalformedURLException e) {
            throw new IllegalStateException("파일 경로가 올바르지 않습니다.", e);
        }

        metadata.setDownloadCount(metadata.getDownloadCount() + 1);
        return new DownloadFile(metadata, resource);
    }

    /**
     * 다운로드 카운트를 증가시키지 않고 파일 리소스만 연다. (통합 페이지의 "연주" 용도)
     */
    @Transactional(readOnly = true)
    public DownloadFile open(Long id) {
        MidiFile metadata = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 파일입니다."));

        Path path = rootDir.resolve(metadata.getStoredFilename()).normalize();
        if (!path.startsWith(rootDir) || !Files.exists(path)) {
            throw new IllegalArgumentException("저장된 파일을 찾을 수 없습니다.");
        }

        try {
            return new DownloadFile(metadata, new UrlResource(path.toUri()));
        } catch (MalformedURLException e) {
            throw new IllegalStateException("파일 경로가 올바르지 않습니다.", e);
        }
    }

    @Transactional
    public void delete(Long id) {
        MidiFile metadata = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 파일입니다."));

        repository.delete(metadata);

        Path path = rootDir.resolve(metadata.getStoredFilename()).normalize();
        if (path.startsWith(rootDir)) {
            try {
                Files.deleteIfExists(path);
            } catch (IOException e) {
                log.warn("업로드 파일 삭제에 실패했습니다: {}", path, e);
            }
        }
    }

    private String sanitizeFilename(String originalFilename) {
        String cleaned = StringUtils.cleanPath(Objects.requireNonNullElse(originalFilename, ""));
        String filename = StringUtils.getFilename(cleaned);
        return filename == null ? "" : filename;
    }

    private String getExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }

    public record DownloadFile(MidiFile metadata, Resource resource) {
    }
}
