# Rhythm Quiz — Inventory và định dạng nhập ngân hàng

Ngày kiểm tra: 13-11-2026. Đây là audit/schema readiness, không phải ngân hàng nội dung mới. Owner xây dựng Blueprint và nội dung riêng; không sinh hoặc nhân bản câu để đạt chỉ tiêu.

## Tồn kho thực tế

| Nguồn | Câu hiện có | Mục tiêu nội dung | Còn thiếu |
|---|---:|---:|---:|
| Level 1 | 10 | 50 | 40 |
| Level 2 | 10 | 50 | 40 |
| Level 3 | 20 | 50 | 30 |
| Level 4 | 10 | 50 | 40 |
| Level 5 | 4 | 50 | 46 |
| Level 6 | 10 | 50 | 40 |
| Bonus 2/2 (tiếp tục duy trì riêng) | 10 | 50 | 40 |
| Tổng Level 1–6 | 64 | 300 | 236 |
| Tổng gồm Bonus | 74 | 350 | 276 |

Mixed là bộ chọn từ bảy nguồn, không có ngân hàng riêng và không phải Level 7. Toàn bộ 74 ID hiện hữu là duy nhất. Không có đáp án sai hoặc câu sai cấp độ được xác nhận theo mapping runtime hiện hành. Đây không phải cam kết rằng 74 câu đã đủ độ đa dạng sư phạm.

## Phát hiện nội dung cần Owner rà soát

Có các cụm gần trùng mệnh đề, không phải trùng ID/nguyên văn: Level 1 cặp `l1-half-value`/`l1-two-beat-note`, cụm giá trị nốt tròn và dấu lặng đen; Level 2 nhiều câu cùng quan hệ hai móc đơn = một nốt đen; Level 3 các câu số phách và suy ra nhịp hỏi theo hai chiều, cụm chấm dôi/nối; Level 4 cụm bốn móc kép = một nốt đen; Level 5 hai câu cùng tổng ba phách với thứ tự cell khác nhau; Bonus nhiều câu cùng hai phách nốt trắng. Level 6 không phát hiện cụm trùng đáng kể. Liên cấp L1/L3 có quan hệ bốn phách trong4/4; L1/Bonus đổi đơn vị nốt tròn từ phách đen sang phách trắng, có thể là bài chuyển giao hợp lệ.

Tiền tố ID `l4-` trong bank runtime Level3 và `l5-` trong Level4 là dấu vết remap, không phải gán track sai. Không đổi ID chỉ để làm tên đẹp: phiên và đáp án dùng định danh. Câu `l1-quarter-value` dùng “trong khung này”, cần Owner kiểm tra ngữ cảnh4/4 khi biên soạn lại. Không tự viết lại câu hỏi trong task audit này.

Độ phủ còn hạn chế: L2 ít ký âm dấu lặng; L3 thiếu bài về vị trí dấu lặng/subdivision; L4 chưa có câu móc giật/đòn gánh; L5 chưa có câu liên ba và cả bốn câu dùng4/4; L6 thiếu bài so sánh phách đơn/phức cùng dots/ties/rests; Bonus thiếu subdivision/rests và so sánh4/4 trực tiếp. Các nội dung mới sẽ do Owner cung cấp, không được padding.

## Schema nhập

Dùng JSON với đúng bảy key `"1"`, `"2"`, `"3"`, `"4"`, `"5"`, `"6"`, `"bonus"`, mỗi key là mảng câu hỏi. Không có key `mixed`. Schema mỗi câu chính là `QuizQuestion` trong `quiz/questionBank.ts`:

```ts
type SourceQuestion = {
  id: string; // duy nhất toàn bộ các nguồn, ổn định qua các phiên
  track: 1 | 2 | 3 | 4 | 5 | 6 | "bonus"; // số JSON, trừ Bonus
  concept: string;
  prompt: string;
  options: readonly { id: string; label: string }[]; // chính xác 4
  correctOptionId: string; // đúng một option.id, không phải A/B/C/D
  explanation: string;
  notation?:
    | { kind: "canonical"; pattern: RhythmPattern; caption: string;
        showTimeSignature?: boolean }
    | { kind: "illustrative-3-8-partial"; caption: string }; // chỉ Level6
};
```

`RhythmPattern` tái dùng canonical schema hiện hành trong `types.ts`, không nhập tọa độ/onset tự tính. Ký âm hoàn chỉnh phải qua canonical validator/timeline và vocabulary theo track; minh họa ô3/8 chưa đủ là loại riêng đã có, không giả làm pattern canonical hợp lệ. Câu nhận diện nhịp dùng `concept: "meter-identification"`, canonical một ô hoàn chỉnh và `showTimeSignature: false`; options nhịp phải suy ra đáp án duy nhất. Caption/prompt không tiết lộ đáp án, renderer ẩn canonical metadata khi cần. Liên ba mới chỉ thuộc nội dung Level5; grouping6/8 và9/8 vẫn theo luật hiện hành.

## Ranh giới nhập và chạy

```ts
const banks = validateQuizBank(ownerApprovedJson);
const questions = createQuizRun(5, "session-seed", 50, banks);
const session = createRhythmQuizSession(5, questions, 1);
const mixed = createQuizRun("mixed", "mixed-seed", 50, banks);
```

`validateQuizBank` kiểm tra nguồn, chuỗi bắt buộc, đúng4options có ID/nhãn phân biệt, đáp án theo identity, ID toàn cục, trùng nội dung chính xác, ký âm canonical và quy tắc nhận diện/grouping hiện có; đóng băng dữ liệu mà không sửa input. Nó không thay thế review nhạc lý/sư phạm, không chứng minh distractor luôn hợp lý, và không tự sửa/lấp câu thiếu. Near-duplicates và vocabulary trong câu hỏi chữ cần được Owner rà soát trước khi nạp bank runtime. Bản hiện tại không có tính năng upload hay tự kích hoạt nội dung chưa duyệt.

Sau review, thay/đăng ký nguồn được duyệt ở boundary hiện hữu; UI vẫn đọc bank runtime đó. Factory nhận bank đã validation để chứng minh không bị khóa ở10/30câu. Lựa chọn50 được thêm vào preset, khóa nếu nguồn thiếu; không tăng default10 và không tạo câu bổ sung. Mixed hiện có74câu, nên có thể mở phiên50 từ đúng74câu hiện hữu.

`quiz/bankImport.test.ts` chỉ dùng record cấu trúc giả lập capacity, có nhãn **test-only**, không phải câu nhạc lý và không được xuất/đăng ký cho người học. Test chạy50record mỗi nguồn qua factory/session/identity scorer,350record Mixed không lặp, duplicate-submit không cộng lần hai, sai schema và duplicate content bị từ chối. Đây là bằng chứng engine capacity, không phải bằng chứng đã có350câu nội dung.

Điểm Quiz đúng+10/sai+0 và Skip−5/minimum0 giữ nguyên. Đảo options chỉ đổi vị trí hiển thị A–D, không đổi `correctOptionId`.
