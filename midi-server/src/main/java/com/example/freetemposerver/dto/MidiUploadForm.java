package com.example.freetemposerver.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

@Getter
@Setter
@NoArgsConstructor
public class MidiUploadForm {

    @NotBlank(message = "제목을 입력해 주세요.")
    @Size(max = 200, message = "제목은 200자 이하여야 합니다.")
    private String title;

    @NotBlank(message = "아티스트를 입력해 주세요.")
    @Size(max = 200, message = "아티스트는 200자 이하여야 합니다.")
    private String artist;

    @NotNull(message = "MIDI 파일을 선택해 주세요.")
    private MultipartFile file;
}
