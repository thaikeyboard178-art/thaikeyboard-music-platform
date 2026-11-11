# Tap Rhythm V1 — Phase 4A.2 Owner Decision Record

**Ngày:** 11 November 2026

**Phạm vi:** Chốt policy trước Phase 4B; tài liệu quyết định độc lập, không triển khai production code.

**Trạng thái tổng thể:** Các quyết định được liệt kê tại Mục 1 đã được Owner xác nhận. Bảy chủ đề tại Mục 2 vẫn chờ Owner chọn; các đề xuất trong bảng không phải quyết định.

## Cách đọc trạng thái

- **APPROVED** — Owner đã xác nhận đúng nội dung được ghi; chỉ áp dụng trong phạm vi nêu rõ.
- **PROPOSED** — Lựa chọn được đề xuất để Owner cân nhắc; chưa được phê duyệt.
- **PENDING** — Cần Owner quyết định trước khi trở thành production policy hoặc bắt đầu Phase 4B.

## 1. Quyết định đã được Owner xác nhận

Trong Formula B, `TP` là số taps ghép một-một với expected onsets trong `Wpass`, `N` là số expected onsets và `K` là số valid physical taps trong collection interval (loại software duplicate, không loại physical extra taps). Các policy xác định interval và window vẫn chờ duyệt ở Mục 2.

| Nội dung | Trạng thái | Quyết định và giới hạn |
|---|---|---|
| Timing Accuracy | **APPROVED** | Dùng Formula B — Event F1: `100 × 2TP / (N + K)`. Không đổi công thức này trong Phase 4A.2. |
| Hướng tolerance và candidate | **APPROVED — candidate priority** | T2 là hướng được ưu tiên. T2-B symmetric actual-local là candidate ưu tiên từ pilot: `α=.30`, `β=.40`, `Cpass=50 ms`, `Cassoc=80 ms`. Việc ưu tiên candidate **không** đồng nghĩa các con số này đã là production defaults; production adoption vẫn **PENDING** tại Mục 2.5. |
| Calibration | **APPROVED** | Không bắt buộc learner calibration trong V1. |
| Mapping clock không đủ tin cậy | **APPROVED** | Xử lý là technical/ungraded; không chấm người học sai vì mapping không đủ tin cậy. Các tiêu chí định lượng để xác định độ tin cậy vẫn **PENDING** tại Mục 2.1. |
| Shared exercise scoring | **APPROVED** | Shared score vẫn `+10` cho correct và `+0` cho incorrect; không trừ điểm. |
| Tách hai loại điểm đo | **APPROVED** | Timing Accuracy độc lập với shared exercise scoring. Formula B không tự thay đổi shared scoring hoặc quyết định correctness gate. |

## 2. Nội dung cần Owner quyết định trước Phase 4B

Mỗi lựa chọn trong cột “Đề xuất” là **PROPOSED**; trạng thái của quyết định tổng thể vẫn là **PENDING**. Không có lựa chọn nào dưới đây được tự động coi là đã duyệt.

### 2.1 Clock mapping — output timestamp bridge, fallback và confidence

| Trạng thái | Đề xuất | Thay thế | Hệ quả kỹ thuật và ảnh hưởng trải nghiệm |
|---|---|---|---|
| **PENDING** | Dùng các cặp `AudioContext.getOutputTimestamp()` từ chính Rhythm AudioContext để nối audio time với performance time. Khi sample thiếu, stale, không ổn định hoặc confidence không đạt tiêu chí do Owner duyệt, kết quả là technical/ungraded — phần xử lý ungraded này đã **APPROVED** ở Mục 1. Không dùng clock fallback để chấm sai người học. | Không có graded fallback; hoặc cho phép graded fallback từ `currentTime`/`performance.now()` chỉ sau khi Owner duyệt ngưỡng confidence riêng. Không tự giả định output latency bằng zero hoặc tự bù offset thiết bị. | Cần xác định freshness, residual/stability, route-change và invalid-timestamp criteria. Fail closed bảo vệ tính công bằng nhưng có thể tạo nhiều attempt technical/ungraded hơn. Graded fallback tăng khả năng hoàn tất bài nhưng có thể chấm khác nhau giữa thiết bị. Calibration không bắt buộc trong V1. |

### 2.2 Collection interval — bắt đầu, kết thúc và delayed-event drain

| Trạng thái | Đề xuất | Thay thế | Hệ quả kỹ thuật và ảnh hưởng trải nghiệm |
|---|---|---|---|
| **PENDING** | Mở collection theo attempt/generation trước onset đầu tiên đủ để nhận tap sớm trong `Wassoc`; đóng sau late-association boundary của onset cuối. Sau đó drain có giới hạn các event đến handler trễ nhưng có event timestamp nằm trong interval; handler arrival chỉ là diagnostic. Thời lượng sớm, muộn và drain phải chờ tolerance/confidence policy được duyệt. | Bắt đầu tại onset đầu tiên, kết thúc ngay tại onset cuối và không drain; hoặc nhận taps trong toàn bộ count-in rồi lọc về sau theo event timestamp. | Mốc mở trước onset giúp tap anticipatory không bị bỏ; interval quá rộng có thể nhận input ngoài bài. Delayed drain giữ event được tạo trước cutoff nhưng cần giới hạn để không trì hoãn feedback. Phải loại event stale generation/đến sau technical abort. |

### 2.3 Matching — ordered DP, early/late, window boundary và tie-break

| Trạng thái | Đề xuất | Thay thế | Hệ quả kỹ thuật và ảnh hưởng trải nghiệm |
|---|---|---|---|
| **PENDING** | Dùng ordered one-to-one dynamic programming: ưu tiên tối đa pair trong `Wpass`, sau đó diagnostic pair trong `Wassoc`, sau đó tối thiểu tổng absolute error. Trong `Wassoc` nhưng ngoài `Wpass`, giữ status `early`/`late`; ngoài `Wassoc` là missing target và extra tap. Đề xuất boundary inclusive; khi hòa, chọn target index trước rồi capture sequence. | Greedy nearest-neighbor đơn giản hơn; hoặc boundary exclusive và tie-break theo sai số nhỏ nhất trước thứ tự event. | DP giảm gán chéo và không tái dùng một tap. Inclusive nhận đúng điểm biên, còn exclusive loại điểm đó; ranh giới ảnh hưởng trường hợp sát ngưỡng. Tie-break ổn định giúp cùng dữ liệu cho cùng kết quả nhưng có thể quyết định target nào nhận tap khi ambiguity còn lại. Cả matching objective lẫn boundary/tie-break đều chưa được duyệt. |

### 2.4 Input — native-event dedup, Space repeat, pointercancel và multi-pointer

| Trạng thái | Đề xuất | Thay thế | Hệ quả kỹ thuật và ảnh hưởng trải nghiệm |
|---|---|---|---|
| **PENDING** | Deduplicate cùng native event bằng identity/sequence, không deduplicate hai physical taps chỉ vì timestamp bằng nhau; bỏ `keydown` Space có `repeat=true`. Khi `pointercancel` hoặc input capture bị hủy, kết thúc attempt technical/ungraded. Chỉ nhận một primary pointer trong mỗi attempt; bỏ qua pointer phụ. | Hỗ trợ nhiều pointer độc lập nếu sản phẩm thực sự cần; hoặc coi `pointercancel` là tap không hợp lệ và tiếp tục attempt nếu clock/generation vẫn đáng tin cậy. | Chính sách một pointer/không repeat giảm double-count do hệ điều hành hoặc multi-touch nhưng giới hạn cách tương tác. Hủy technical có thể yêu cầu người học làm lại nhưng tránh biến mất focus/cancel thành incorrect. Cần định nghĩa event identity, pointer ownership và hành vi blur/hidden nhất quán. |

### 2.5 Tolerance — production adoption của T2-B, density và boundary

| Trạng thái | Đề xuất | Thay thế | Hệ quả kỹ thuật và ảnh hưởng trải nghiệm |
|---|---|---|---|
| **PENDING** | Duyệt T2-B symmetric actual-local làm production policy chỉ sau khi xác nhận riêng: `P=60/pulseBpm`, `S=P×gridTicks/pulseTicks`, `G=min(S, positive adjacent target gaps)`, `Wpass=min(Cpass, .30×G)`, `Wassoc=min(Cassoc, .40×G)`, với `Cpass=50 ms`, `Cassoc=80 ms`. Quy đổi G và caps về cùng một đơn vị thời gian trước phép `min`; dùng S khi không có neighbor hợp lệ. Đề xuất cửa sổ inclusive ở boundary. | T2 legal-grid (`G=S`) là biến thể cần thiết để so sánh; T2-A/C là candidate hẹp/rộng hơn; T1 fixed-ms chỉ là comparator nếu Owner không chọn T2. Có thể chọn asymmetric windows, nhưng không tự bật. | Actual-local giới hạn window theo khoảng cách onset thực và giảm overlap trong pilot; T2-B vẫn chỉ là candidate, không phải default. Các caps/ratios ảnh hưởng pass/near/missing ở tempo và grid khác nhau. Inclusive/exclusive boundary ảnh hưởng đúng điểm biên; cần quy định phép so sánh số thực. Không tự nâng vocabulary Level 6/Bonus hoặc thay meter/curriculum. |

### 2.6 Scoring gate — chuyển kết quả hoàn tất thành +10 hoặc +0

| Trạng thái | Đề xuất | Thay thế | Hệ quả kỹ thuật và ảnh hưởng trải nghiệm |
|---|---|---|---|
| **PENDING** | Strict gate: chỉ correct `+10` nếu tất cả expected onsets được matched trong `Wpass` và không còn extra taps; mọi missing, near-miss hoặc extra cho incorrect `+0`. Technical/ungraded không tạo shared answer/điểm. | Duyệt threshold Formula B và allowance missing/extra rõ ràng, không đổi Formula B; hoặc yêu cầu một tổ hợp điều kiện thay vì threshold đơn. | Strict gate đơn giản, dễ kiểm thử nhưng nghiêm khắc với một lỗi nhỏ; threshold có thể khoan dung hơn nhưng cần chọn ngưỡng/allowance và diễn giải feedback. Timing Accuracy vẫn là chỉ số riêng, không tự quyết định shared score cho đến khi gate được duyệt. |

### 2.7 Reference policy — count-in, continuous metronome, reference playback và replay

| Trạng thái | Đề xuất | Thay thế | Hệ quả kỹ thuật và ảnh hưởng trải nghiệm |
|---|---|---|---|
| **PENDING** | Có count-in trước attempt graded; Owner quyết định số phách/ô nhịp. Cho phép continuous metronome dạng tick theo pulse như một cấu hình hướng dẫn rõ ràng, không suy ra thêm exercise kind hoặc tự thay curriculum. Có tối đa một pattern reference không chấm trước attempt; không replay giữa attempt graded. Một replay/attempt mới phải là generation mới và không rescore shared exercise. | Chỉ count-in rồi im lặng; không phát pattern reference; hoặc cho phép nhiều reference/replay trước attempt. | Count-in/tick có thể hỗ trợ giữ pulse nhưng tăng guidance; reference playback có thể làm bài dễ hơn và cần xác định rõ ungraded. Giới hạn replay tránh đổi audio anchor giữa attempt, còn cho phát lại trước attempt hỗ trợ người mới. Số count-in, bật/tắt metronome theo cấu hình, số replay và chính sách retry đều phải được Owner duyệt. |

## 3. Ranh giới triển khai

Tài liệu này ghi lại các quyết định đã xác nhận và các mục cần Owner chọn; **không** phê duyệt production matcher, clock capture/bridge, numeric confidence thresholds, tolerance defaults, scoring gate hoặc reference behavior. Không thay Formula B; không thêm exercise kind hay sửa curriculum Level 1–6/Bonus 2/2; không thay Phase 1–3. Phase 4B chỉ có thể bắt đầu sau khi các mục cần thiết ở Mục 2 được Owner quyết định rõ ràng.
