package com.example.freetemposerver.repository;

import com.example.freetemposerver.domain.MidiFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MidiFileRepository extends JpaRepository<MidiFile, Long> {

    Page<MidiFile> findByTitleContainingIgnoreCaseOrArtistContainingIgnoreCase(
            String title, String artist, Pageable pageable);
}
