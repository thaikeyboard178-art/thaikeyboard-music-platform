# Tap Rhythm V1 — Phase 4A.2 Owner Decision Record

**Ngày cập nhật:** 11 November 2026

**Phạm vi:** Ghi nhận policy đã được Owner phê duyệt làm baseline cho Tap Rhythm Engine Phase 4B. Tài liệu này cập nhật quyết định hiện có; không triển khai production code.

## Cách đọc trạng thái

- **APPROVED** — Owner đã xác nhận nội dung và phạm vi ghi ở đây.
- **PROPOSED** — Phương án để cân nhắc, chưa được phê duyệt.
- **PENDING** — Cần quyết định thêm trước khi triển khai policy tương ứng.

Các quyết định được nêu trong Mục 1 và Mục 2 dưới đây đã được xác nhận là **APPROVED**. Phần “không chọn” ghi lại các phương án thay thế, không phải lựa chọn đang hoạt động.

## 1. Quyết định Owner đã xác nhận

Trong Formula B, `TP` là số taps được ghép một-một với expected onsets trong `Wpass`; `N` là tổng expected onsets; `K` là tổng physical taps hợp lệ trong collection interval sau khi loại software duplicate, không loại physical extra taps.

| Nội dung | Trạng thái | Quyết định và giới hạn |
|---|---|---|
| Timing Accuracy | **APPROVED** | Formula B — Event F1: `Accuracy = 100 × 2TP / (N + K)`. Khi `N=0`, kết quả Not applicable. Technical abort trả accuracy `null`, không chấm. Không đưa Timing Accuracy vào shared `TrainingResult.accuracy`. |
| T2-B tolerance | **APPROVED** | Dùng T2; T2-B symmetric actual-local được duyệt với `α=.30`, `β=.40`, `Cpass=50 ms`, `Cassoc=80 ms`. Đây là production policy đã được Owner duyệt, không còn chỉ là candidate. Không đổi nếu không có approval mới. |
| Clock và calibration | **APPROVED** | `AudioContext.getOutputTimestamp()` là primary clock bridge; không có graded fallback khi mapping không đủ tin cậy. Mapping không tin cậy là technical/ungraded, không phải lỗi người học. Không bắt buộc learner calibration; không tự trừ device offset hay giả định physical latency bằng zero. Chi tiết confidence ở Mục 2.1. |
| Shared exercise scoring và gate | **APPROVED** | Correct `+10`, incorrect `+0`, không trừ điểm. Strict gate: chỉ `+10` khi toàn bộ expected onsets matched trong `Wpass` và không có extra taps. Một shared answer cho mỗi graded exercise; Timing Accuracy độc lập với Exercise Points. Technical abort, replay và retry không tạo answer/điểm mới. |
| Capture input cơ bản | **APPROVED** | Nhận native `pointerdown` hoặc Space `keydown` không-repeat; giữ native event identity, một primary pointer; chi tiết dedup, timestamp và `pointercancel` ở Mục 2.4. |

## 2. Quyết định bổ sung đã được Owner phê duyệt

### 2.1 Clock confidence và fallback

| Trạng thái | Quyết định được duyệt | Phương án không chọn | Hệ quả kỹ thuật và ảnh hưởng trải nghiệm |
|---|---|---|---|
| **APPROVED** | Dùng `AudioContext.getOutputTimestamp()` làm primary bridge từ chính Rhythm AudioContext. Sample phải có timestamps hợp lệ, hữu hạn và dương. `contextTime` và `performanceTime` phải tiến triển đơn điệu, không đi lùi. Tại thời điểm event được đánh giá, usable sample mới nhất không được cũ hơn 100 ms. Thiếu, stale, invalid hoặc non-monotonic mapping đều là technical/ungraded; không graded fallback và không chấm mapping không tin cậy thành lỗi người học. | Graded fallback bằng `currentTime`/`performance.now()`, zero-latency assumption, hoặc tự trừ device offset. | Cần kiểm tra sample validity, hai clock’s monotonicity và freshness theo event time. Fail closed có thể tạo attempt ungraded khi thiết bị không đủ tin cậy, nhưng tránh quy lỗi clock cho người học. Calibration vẫn không bắt buộc. |

### 2.2 Collection interval và delayed-event drain

| Trạng thái | Quyết định được duyệt | Phương án không chọn | Hệ quả kỹ thuật và ảnh hưởng trải nghiệm |
|---|---|---|---|
| **APPROVED** | Mở collection tại `firstExpectedOnset − Wassoc(first)`; đóng tại `lastExpectedOnset + Wassoc(last)`. Sau khi interval đóng, drain delayed handler delivery tối đa 100 ms. Trong drain, chỉ nhận event có original `event.timeStamp` nằm trong musical collection interval. Không kéo dài interval âm nhạc vì handler đến trễ. | Dùng handler arrival làm event time hoặc kéo dài collection interval theo thời điểm handler nhận event. | Phải lưu event timestamp gốc và phân biệt musical cutoff với thời hạn drain. Drain cho event đến muộn cơ hội được xử lý nhưng feedback chỉ chờ tối đa 100 ms; event có timestamp ngoài interval không được đưa vào matching. |

### 2.3 Ordered Dynamic Programming matching

| Trạng thái | Quyết định được duyệt | Phương án không chọn | Hệ quả kỹ thuật và ảnh hưởng trải nghiệm |
|---|---|---|---|
| **APPROVED** | Ghép ordered one-to-one bằng Dynamic Programming; không ghép chéo thứ tự, mỗi tap/onset ghép tối đa một lần. Objective theo đúng thứ tự: (1) tối đa pairs trong `Wpass`; (2) tối đa diagnostic pairs trong `Wassoc`; (3) tối thiểu tổng absolute timing error; (4) hòa thì theo target index, sau đó capture sequence. Dùng inclusive boundaries. Phân loại `matched`, `early`, `late`, `missing`, `extra`; near-miss ngoài `Wpass` không tính TP. Rest và tie continuation không tạo expected onset. | Greedy nearest-neighbor, exclusive boundary, hoặc tái sử dụng một event cho nhiều onset. | DP cho assignment xác định và giữ thứ tự, tránh một tap chiếm nhiều targets. Inclusive boundary chấp nhận đúng điểm ngưỡng; tie-break giữ kết quả lặp lại ổn định. Rests/tie continuations không bị chấm thành taps bị thiếu. |

### 2.4 Native event capture và input lifecycle

| Trạng thái | Quyết định được duyệt | Phương án không chọn | Hệ quả kỹ thuật và ảnh hưởng trải nghiệm |
|---|---|---|---|
| **APPROVED** | Nhận native `pointerdown` hoặc Space `keydown` không-repeat. Ghi raw `event.timeStamp` ngay khi handler bắt đầu; giữ handler arrival time chỉ làm diagnostic. Bỏ Space repeat. Deduplicate cùng native event; không gộp hai physical taps chỉ vì timestamp bằng nhau. Chỉ nhận một primary pointer. `pointercancel` theo technical-abort policy, không tính là câu trả lời sai. | Deduplicate chỉ theo timestamp, nhận Space repeat hoặc nhận nhiều pointer độc lập trong cùng attempt. | Cần lưu event identity/sequence và generation để loại redelivery/stale event mà vẫn giữ physical double taps. Một primary pointer hạn chế multi-touch; `pointercancel` làm attempt technical/ungraded thay vì phạt người học. |

### 2.5 T2-B symmetric actual-local tolerance

| Trạng thái | Quyết định được duyệt | Phương án không chọn | Hệ quả kỹ thuật và ảnh hưởng trải nghiệm |
|---|---|---|---|
| **APPROVED** | Dùng `P=60,000/pulseBpm ms`, `S=P×gridTicks/pulseTicks ms`, `G=min(S, positive adjacent target gaps in ms)`; khi thiếu neighbor hợp lệ, dùng `S`. Tất cả khoảng thời gian trong công thức ở đơn vị ms: `Wpass(i)=min(50 ms, 0.30×G(i))`; `Wassoc(i)=min(80 ms, 0.40×G(i))`. Cửa sổ đối xứng trước/sau onset và boundaries inclusive. | T1 fixed-ms làm production policy, legal-grid thay actual-local, T2-A/T2-C thay T2-B, hoặc asymmetric windows. | Actual-local giới hạn tolerance theo mật độ onset và legal grid. Cùng một millisecond error có thể được phân loại khác nhau theo tempo/grid; inclusive edges xác định rõ treatment tại đúng ngưỡng. Không đổi các thông số nếu không có approval mới và không thay curriculum/vocabulary. |

### 2.6 Shared scoring strict gate

| Trạng thái | Quyết định được duyệt | Phương án không chọn | Hệ quả kỹ thuật và ảnh hưởng trải nghiệm |
|---|---|---|---|
| **APPROVED** | Sau khi graded exercise hoàn tất, chỉ correct `+10` nếu tất cả expected onsets matched trong `Wpass` và không còn extra taps; nếu không đạt điều kiện thì incorrect `+0`. Tối đa một shared answer mỗi graded exercise. Timing Accuracy vẫn là metric riêng. Technical abort, replay và retry không tạo answer hoặc điểm mới. | Threshold Formula B, allowance missing/extra, hoặc cộng/trừ shared points theo mức sai lệch. | Gate rõ ràng, dễ kiểm thử và không trộn timing percentage với shared points; strictness có thể cảm nhận là cao nếu chỉ lệch một onset. Formula B không đổi. |

### 2.7 Count-in, reference và replay

| Trạng thái | Quyết định được duyệt | Phương án không chọn | Hệ quả kỹ thuật và ảnh hưởng trải nghiệm |
|---|---|---|---|
| **APPROVED** | Có một bar count-in trước mỗi graded attempt. Continuous technical-pulse metronome hoạt động trong attempt. Tối đa một reference playback trước mỗi graded attempt; không phát lại reference trong attempt. Retry sau một graded attempt đã hoàn tất chỉ là practice và không thể tạo thêm shared answer/score. Không thêm voice counting hoặc voice assets. | Bỏ count-in/metronome đã duyệt, phát reference trong khi đang chấm, hoặc để retry tạo thêm shared score. | Count-in và pulse tick giúp chuẩn bị/giữ nhịp; reference trước bài cung cấp mẫu mà không can thiệp attempt. Replay/retry phải tách generation và giữ kết quả graded ban đầu bất biến; retry sau hoàn tất không ghi điểm lần nữa. |

## 3. Ranh giới triển khai

Các policy tại Mục 1–2 là các quyết định Owner đã phê duyệt làm baseline cho Phase 4B. Bản ghi này chỉ cập nhật quyết định; không tự tạo exercise kind, không thay Level 1–6 hoặc Bonus 2/2, không đổi quota Assessment Level 6 và không sửa Phase 1–3. Không bao gồm UI, routes, database, dependencies hoặc deployment.
