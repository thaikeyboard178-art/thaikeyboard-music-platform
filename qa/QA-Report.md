# Báo cáo QA — THAIKEYBOARD Music Training / Note Reading

**Ngày kiểm tra:** 10/11/2026. **Phạm vi:** module Note Reading hiện có, trang chủ và hạ tầng tích hợp liên quan. **Môi trường:** Manus Sandbox, Chromium, Vitest/jsdom, Node/pnpm của dự án. Không triển khai/publish, không sửa WordPress, không thêm Rhythm Training, Chord Recognition hay module khác.

## 1. Kết luận

Bộ kiểm thử cuối cùng đạt **98/98 test trong 13 tệp**; TypeScript đạt; cả `pnpm build:static` và `pnpm build` thành công. Các luồng chính đã được thao tác trong browser, không chỉ suy luận từ mã nguồn. Đã xác nhận và sửa **13 vấn đề** về bàn phím piano, thông tin câu hỏi/thời gian, minh họa trang chủ, ngày Daily, session/scoring và khả năng sử dụng/accessibility.

Không phát hiện sai ánh xạ cao độ của bài tập hiện tại: **50 fixture** (25 vị trí mỗi khóa, từ -8 đến 16) khớp tên nốt, quãng tám, MIDI, tọa độ notehead thực tế, năm dòng kẻ cách đều và số dòng phụ. Điều này áp dụng cho các nốt tự nhiên đang được sinh; không phải chứng nhận cho tính năng dấu hóa/hóa biểu tương lai.

Đây là kết quả QA trong môi trường đã thử, **không phải tuyên bố ứng dụng hoạt động trên mọi thiết bị hoặc đạt toàn bộ WCAG**. Những phần chưa thử được liệt kê ở cuối báo cáo.

## 2. Phạm vi rà soát mã nguồn

Rà soát độc lập theo bảy phạm vi: notation/data flow; generator/configuration/modes; session/scoring/results; piano/audio/keyboard; navigation/progress; responsive/accessibility; integration/test/env/infrastructure. Sau đó đối chiếu các phát hiện với browser và kiểm thử hồi quy. Các phát hiện từ đọc mã không được tự động coi là kiểm tra browser đạt.

| Khu vực | Tệp/chức năng chính được kiểm tra |
|---|---|
| Trang chủ và định tuyến | `client/src/pages/Home.tsx`, `client/src/App.tsx`, route manifest, landing CTA/module card/progress |
| Thiết lập và UI bài tập | `ExerciseSetup.tsx`, `NoteReadingPage.tsx`, các điều khiển khóa/phạm vi/mode/số câu/phương thức trả lời |
| Nhạc lý và hiển thị | `types.ts`, `notation/musicTheory.ts`, `notation/VexFlowStaff.tsx` |
| Generator và chấm đáp án | `services/exercises.ts`, `configuration.ts`, `module.ts` |
| Session dùng chung | `client/src/features/training/session.ts`, `types.ts` |
| Piano và âm thanh | `VirtualPiano.tsx`, `services/audio.ts` |
| Responsive và tích hợp | `index.css`, module registry, package/lockfile/Vitest/build config/README/env example, server/shared/schema/migrations/Dockerfile |

Các phụ thuộc/hạ tầng không thuộc Note Reading được xem xét về tích hợp, bảo toàn và bộ test hiện có; không thực hiện giao dịch OAuth, migration database hay vận hành production server với dịch vụ thật.

## 3. Tính năng và luồng đã kiểm tra

| Tính năng/luồng | Cách kiểm tra thực tế | Kết quả |
|---|---|---|
| Landing → Note Reading | Nhấp CTA thật trong browser; thử module card quay lại setup; xác nhận progress tổng hợp xuất hiện sau lượt hoàn thành | Đạt trong Chromium |
| Chọn khóa Sol/Fa/xen kẽ | UI/kiểm thử DOM và generator; bài tập Fa mở rộng chạy trong browser | Đạt |
| Ba phạm vi nốt | Fixture bounds `[0,8]`, `[-2,10]`, `[-8,16]`; test generator cho cả ba khóa/range, 250 mẫu mỗi tổ hợp | Đạt trong số mẫu đã thử; generator lấy trực tiếp tập vị trí hợp lệ |
| Trắc nghiệm | Bảy nốt Đô/Rê/Mi/Fa/Sol/La/Si; click đáp án; phím số 1 thật; unit/UI thử phím 1–7 và duplicate | Đạt; đúng +10, sai +0 |
| Phản hồi và Câu tiếp | Kiểm tra đáp án có letter/octave, highlight đúng/sai, giữ số câu đang hiển thị, chuyển sang câu mới, giữ điểm | Đạt sau sửa |
| Free Practice | Trả lời 55 câu rồi tiếp tục vẫn không tự kết thúc; kết thúc thủ công trả kết quả 55 câu | Đạt trong lượt đã thử; mã dùng `plannedQuestions: null` |
| Challenge | Hoàn thành 10/20/30/50 câu trong browser, trước và sau sửa; kiểm tra tổng đúng+sai và điểm = đúng × 10 | Đạt; không còn nút hoàn thành sớm |
| Daily Challenge | Browser thử chuỗi cố định 10 câu, 5 đúng/5 sai → 50 điểm/50%; retry cùng nốt đầu; test ngày kế tiếp đổi chuỗi | Đạt |
| Daily qua nửa đêm | Hồi quy dùng thời gian giả: bắt đầu 23:59:59 rồi đổi sang ngày mới và trả lời | Đạt sau sửa; ngày/chuỗi của lượt đang chạy được giữ nguyên |
| Speed không giới hạn | Chờ hơn 3 giây ở cấu hình không giới hạn, không tự chấm | Đạt trong browser |
| Speed có timeout | Browser đợi timeout 3 giây → một câu sai/0 điểm; chờ tiếp không chấm trùng; Câu tiếp bắt đầu lại 3 giây. Hồi quy timer tự động tương ứng | Đạt |
| Piano đúng/sai quãng tám | Click La2 đúng; thử cùng letter ở quãng tám sai; highlight phím sai và đích đúng; không mất điểm | Đạt |
| Piano đầy đủ và điều hướng | 14 phím trắng + 10 phím đen; La thăng được phục hồi; thử biên bắt đầu quãng 1 và quãng 6 | Đạt sau sửa |
| Piano bằng bàn phím | Phím số thật không bypass piano; Enter thật trên phím Mi4 đang focus chấm đúng | Đạt sau sửa; piano dùng chọn phím/focus+Enter thay vì tự suy ra octave từ phím số |
| Web Audio | Đo tần số API từ thao tác chuột/Enter thật: La2 = 110Hz, Mi4 ≈ 329.6275569Hz; context tạo sau thao tác, state `closed` sau rời piano; unit test reuse/unsupported fallback | Đạt ở tầng API; chưa nghe/đánh giá chất lượng âm thanh bằng tai |
| Result/retry/return | Kiểm tra số câu, đúng/sai, điểm, accuracy, thời gian trung bình; retry reset số câu/điểm; return setup; focus result | Đạt |
| Local progress | Test lưu aggregate khi lượt hoàn tất; browser landing hiển thị aggregate đã lưu; không ghi thêm khi chỉ retry chưa hoàn tất | Đạt |
| Đồng hồ câu | Browser và hồi quy: câu 1 mất 1s, câu 2 mất 0.1s; sau câu 2 hiển thị 0.1s thay vì trung bình 0.6s | Đạt sau sửa |

Ví dụ Challenge sau sửa trong browser: 10 câu có 1 đúng/9 sai/10 điểm; 20 câu có 5 đúng/15 sai/50 điểm; 30 câu có 5 đúng/25 sai/50 điểm; 50 câu có 5 đúng/45 sai/50 điểm. Nốt ngẫu nhiên nên kết quả đúng/sai giữa các lần chạy khác nhau; tính bất biến kiểm tra là số câu và quy tắc điểm, không phải một số lượng đáp án đúng cố định.

## 4. Chứng minh nhạc lý và cùng nguồn dữ liệu

Gọi `p` là bước diatonic tính từ dòng kẻ dưới cùng. Khóa Sol có mốc **E4/Mi4**; khóa Fa có mốc **G2/Sol2**. Mỗi bước tăng một letter theo thứ tự C–D–E–F–G–A–B, đổi octave khi qua B→C. MIDI tự nhiên theo `12 × (octave + 1) + semitone(letter)`, với semitone C/D/E/F/G/A/B = 0/2/4/5/7/9/11.

Renderer được đo trong Chromium: các dòng kẻ ở y = 86.5, 98.5, 110.5, 122.5, 134.5; chênh đúng 12px. VexFlow snap stroke theo nửa pixel, trong khi origin notehead ở `y = 134 − 6p`. Mỗi bước dòng↔khe cách 6px. Số dòng phụ dưới là `floor(-p/2)` khi p<0; trên là `floor((p−8)/2)` khi p>8; trong khuông không có dòng phụ.

| Vị trí p | Khóa Sol: nốt / MIDI | Khóa Fa: nốt / MIDI |
|---:|---|---|
| -8 | D3 / 50 | F1 / 29 |
| -7 | E3 / 52 | G1 / 31 |
| -6 | F3 / 53 | A1 / 33 |
| -5 | G3 / 55 | B1 / 35 |
| -4 | A3 / 57 | C2 / 36 |
| -3 | B3 / 59 | D2 / 38 |
| -2 | C4 / 60 | E2 / 40 |
| -1 | D4 / 62 | F2 / 41 |
| 0 | E4 / 64 | G2 / 43 |
| 1 | F4 / 65 | A2 / 45 |
| 2 | G4 / 67 | B2 / 47 |
| 3 | A4 / 69 | C3 / 48 |
| 4 | B4 / 71 | D3 / 50 |
| 5 | C5 / 72 | E3 / 52 |
| 6 | D5 / 74 | F3 / 53 |
| 7 | E5 / 76 | G3 / 55 |
| 8 | F5 / 77 | A3 / 57 |
| 9 | G5 / 79 | B3 / 59 |
| 10 | A5 / 81 | C4 / 60 |
| 11 | B5 / 83 | D4 / 62 |
| 12 | C6 / 84 | E4 / 64 |
| 13 | D6 / 86 | F4 / 65 |
| 14 | E6 / 88 | G4 / 67 |
| 15 | F6 / 89 | A4 / 69 |
| 16 | G6 / 91 | B4 / 71 |

Cả 50 fixture có tọa độ notehead và số dòng phụ khớp phép tính. Cực hạn p=-8 và p=16 đều có bốn dòng phụ, lần lượt origin y=182 và y=38 trong SVG cao 198px.

**Data flow:** generator tạo `NoteExercise.note` → session giữ `currentExercise.note` → cùng đối tượng được truyền vào `VexFlowStaff`; `vexFlowKey` lấy letter/octave từ đối tượng đó. Cả trắc nghiệm và piano gọi `noteReadingModule.validateAnswer` trên exercise đang giữ trong session. Validator so letter, octave, accidental và pitchValue, không suy đáp án từ ảnh/pixel. Trắc nghiệm chủ ý hỏi tên nốt nên dùng octave hiện tại khi tạo payload; piano buộc người học chọn octave của phím. Các fixture độc lập kiểm tra cả đáp án đúng lẫn cùng letter sai octave.

Minh họa landing là SVG trang trí riêng, không sinh bài tập; nó từng ghi Mi4 nhưng đặt ở dòng giữa. Lỗi minh họa này đã sửa về dòng dưới cùng và có hồi quy riêng.

## 5. Lỗi xác nhận, nguyên nhân và sửa

| ID | Lỗi/nguyên nhân | Sửa và bằng chứng kiểm tra lại |
|---|---|---|
| QA-01 | Piano chỉ có bốn phím đen/octave; map `BLACK_KEY_AFTER` thiếu A | Bổ sung A→B; hai hồi quy đủ 14 trắng/10 đen và A#3 MIDI58; browser đếm 24 phím |
| QA-02 | Bộ đếm dùng answered+1 ngay khi đang phản hồi câu vừa trả lời | Dùng `currentExercise.index`; UI regression và browser giữ Câu1 tới khi nhấp Câu tiếp |
| QA-03 | Landing ghi Mi4 nhưng notehead ở dòng giữa | Dời notehead/stem/flag tới dòng E4; test so cy với dòng cuối và ảnh mobile cuối |
| QA-04 | Daily seed lấy ngày khi bắt đầu nhưng heading đọc ngày hiện tại mỗi render | Giữ challenge date của session; test rollover qua nửa đêm |
| QA-05 | Shared session bỏ qua `pointsPerCorrect` của config; có thể nhận override âm/non-finite | Lưu cấu hình/default10, từ chối giá trị không hợp lệ bằng fallback; regression cấu hình20 và override âm/NaN/Infinity. Note Reading vẫn +10/+0 |
| QA-06 | `finishSession` cho hoàn thành Challenge/Daily trước đủ số câu | Guard shared transition; không hiển thị nút kết thúc sớm trong hai mode; test helper/UI và full browser 10/20/30/50 |
| QA-07 | 1–7 trong piano tự dựng payload theo octave đích, bỏ qua việc chọn phím và không phát âm thanh | Chỉ đăng ký shortcut trắc nghiệm; piano dùng key/focus+Enter; test số1–7 không submit, browser số1 và Enter thật |
| QA-08 | Renderer ép width tối thiểu300 dù host mobile320px chỉ256 | Giảm sàn phù hợp và dùng width thực của host; hồi quy host240 và browser SVG256/host256 |
| QA-09 | Các view thay thế không quản lý focus | Focus answer/piano region, Câu tiếp, result heading và setup heading theo transition; UI assertions và browser |
| QA-10 | Nút octave23px và phím đen khoảng20px quá nhỏ | Nút octave44px; keybed tối thiểu560 để phím đen≈26.78px; controls phụ tối thiểu44px, toolbar wrap; đo browser |
| QA-11 | Một số chữ phụ nhỏ có contrast thấp | Đổi nhóm chữ phụ được chỉ ra sang #59666b và tăng một số cỡ chữ; browser xác nhận computed style; contrast mẫu 5.45:1/5.88:1/5.63:1 trên ba nền tương ứng |
| QA-12 | Thiếu ngữ nghĩa current page và scroll-region/focus ring của piano | `aria-current="page"`, role region, visible focus; test DOM/focus và browser |
| QA-13 | “Thời gian câu” sau đáp án dùng average của cả lượt thay vì thời gian câu vừa trả lời | Dùng elapsed của câu hiện tại; hồi quy và browser 1s rồi0.1s; average ở result vẫn giữ riêng |

Không chuyển tất cả khuyến nghị đọc mã thành tính năng mới. Việc session chỉ nằm trong bộ nhớ và không resume sau về trang chủ/refresh phù hợp với thiết kế hiện tại chưa làm account/history/cloud sync. “Tiếp tục luyện” mở setup để luyện tiếp, không có nghĩa resume câu đang làm; đã thao tác xác nhận và ghi là giới hạn, không thêm hệ thống resume ngoài yêu cầu.

## 6. Responsive và khả năng sử dụng

Đã xem ảnh landing/setup ở desktop1280px, tablet768px và mobile390px; ảnh cuối ở320px. Màn bài tập/piano được dựng trong iframe cùng origin có viewport thật 320/390/768/1280px trong Chromium, đo DOM và click trả lời. Đây không phải thử bằng ngón tay trên thiết bị vật lý.

| Viewport | Host notation sau sửa | SVG sau sửa | Phím đen sau sửa | Nút octave |
|---:|---:|---:|---:|---:|
| 320 | 256px | 256px | 26.78px | 44px |
| 390 | 311px | 311px | 26.78px | 44px |
| 768 | 431px | 431px | 26.78px | 44px |
| 1280 | 875px | 875px | 42.19px | 44px |

Ở320px trước sửa, SVG rộng300px trong host256px: mismatch được đo trực tiếp. Sau sửa, không thấy page scrollWidth vượt viewport ở bốn mẫu; piano vẫn có **cuộn ngang nội bộ có chủ ý** để giữ phím đủ rộng. Click phím đen cho phản hồi sai đúng quy tắc tại cả bốn kích thước.

Chỉ các mẫu contrast đã nêu được tính lại, không khẳng định toàn bộ bảng màu/zoom/assistive technology đã đạt WCAG. Piano label và thao tác ngón tay vẫn cần thử thiết bị thật.

## 7. Kiểm thử tự động và bản dựng

| Suite | Test đạt cuối |
|---|---:|
| Server auth logout / platform integration | 1 + 5 |
| Home illustration | 1 |
| Shared session/scoring | 6 |
| Configuration | 2 |
| VirtualPiano component | 2 |
| VexFlowStaff SVG/responsive | 3 |
| Music theory | 6 |
| Independent QA fixtures + generator combinations | 53 |
| Existing NoteReadingPage UI | 3 |
| New UI regressions | 8 |
| Audio engine | 3 |
| Exercise service | 5 |
| **Tổng** | **98/98, 13 tệp** |

**Các lần thất bại:** baseline trước QA đạt28/28, nhưng không có coverage cho các lỗi mới tìm thấy. Khi thêm regression trước sửa, 3 test thất bại đúng dự kiến: thiếu hai La thăng/không chọn được A#3 và số câu chuyển sớm. Sau sửa đều đạt. Một test Home mới ban đầu gặp `React is not defined` do JSX transform của Vitest; thêm React import tương thích, không phải lỗi browser production. Harness browser cũng có lỗi expectation “1” thay vì “1 / 10” và một lần chọn sai trạng thái sau hot reload; các lỗi harness được sửa/tách khỏi lỗi sản phẩm. **Không còn test tự động thất bại ở lần chạy cuối.**

| Lệnh | Kết quả cuối |
|---|---|
| `pnpm check` | Exit0, không lỗi TypeScript |
| `pnpm test` | Exit0, 98 test đạt |
| `pnpm build:static` | Exit0, sinh `dist/public` |
| `pnpm build` | Exit0, sinh frontend và `dist/index.js` |
| `git diff --check` | Không lỗi whitespace |
| GET `/manus-routes.json` | JSON đúng hai route `/`, `/note-reading` |

Cảnh báo build còn lại: classic `/api/platform/config.js` không được Vite bundle như module nhưng tệp runtime config vẫn được sinh; chunk notation lớn hơn500kB. Chunk NoteReadingPage cuối khoảng **1,210.75kB raw / 712.55kB gzip**, được lazy-load theo route. Đây là giới hạn hiệu năng còn lại, không được che bằng tắt cảnh báo.

Log auth test có cảnh báo payload thiếu trường từ test âm đã chủ ý chạy; suite vẫn đạt. Không gọi migration/`db:push`, không chạy deployment.

## 8. GitHub và bảo toàn hạ tầng

Repository canonical: **`thaikeyboard178-art/thaikeyboard-music-platform`**, private. Khi bắt đầu QA, local `main` sạch và GitHub `main` cùng commit `2f6231ba34ffe3665dad83f17173fbdd0c7905c8`; pull fast-forward trả “Already up to date”.

Các sửa QA, hồi quy và bằng chứng browser đã được normal commit/push thành công lên `origin/main` tại **`2ad7395b9fd0f739e3a53f287810b6e34eedb1cd`** (`Fix Note Reading QA defects and add regression coverage`). GitHub trả xác nhận `2f6231b..2ad7395 main -> main`. Không rewrite lịch sử/force-push. Báo cáo và TODO được lưu tiếp bằng commit chỉ tài liệu; SHA checkpoint tài liệu và worktree sạch được ghi trong bản bàn giao cuối.

Diff QA không thay đổi `server/`, `shared/`, `drizzle/`, Dockerfile, package manifests/lockfile, logo config hay route manifest. Không thêm dependency trong QA. `.env.example` giữ các biến và giá trị secret trống; không xuất credential thật. `publishing.auto_publish` đã đọc là **false**, không gọi publish/deploy và không tác động WordPress.

## 9. Giới hạn còn lại và việc cần thử thủ công

| Hạng mục chưa được chứng minh | Việc cần làm |
|---|---|
| Thiết bị/browser khác | Thử Safari iOS, Chrome Android, Firefox và Safari desktop; rotation tablet/mobile |
| Touch vật lý | Thử ngón tay trên phím trắng/đen, cuộn piano, nút octave và tình huống cuộn bị nhầm click |
| Chất lượng âm thanh | Nghe bằng loa/tai nghe, kiểm tra latency, volume, iOS autoplay/silent mode; phép đo API không thay thế kiểm tra bằng tai |
| Accessibility đầy đủ | Screen reader, zoom200%/400%, tab order toàn trang, keyboard horizontal scrolling và audit contrast đầy đủ; chưa có chứng nhận WCAG |
| Mạng yếu/hiệu năng | Cold cache/3G, tải chunk VexFlow lớn, memory và luyện kéo dài nhiều giờ |
| Background/thời gian | Tab ngủ/throttling, thay timezone khi đang luyện, timing click đúng biên timeout trên nhiều browser; unit timeout/rollover không mô phỏng mọi browser policy |
| Storage | Browser chặn quota/private mode, dữ liệu malformed trên nhiều browser; source có fallback nhưng chưa stress-test đầy đủ |
| Resume | Refresh/về trang chủ bỏ active session; chỉ aggregate của lượt đã hoàn tất được giữ; chưa triển khai resume/history |
| Nốt có dấu hóa | Generator chỉ sinh nốt tự nhiên. Phím đen có cao độ/đáp án sai được kiểm tra; không triển khai hay chứng nhận bài tập thăng/giáng/hóa biểu |
| Production backend | OAuth thật, MySQL/migrations, Docker runtime, routing/cache/headers của hosting production chưa chạy; không deploy theo yêu cầu |
| Nội dung result | H1/result stats kiểm tra; final answer tự chuyển result nên không có bước feedback riêng cho câu cuối. Nếu muốn dừng để giải thích câu cuối, cần quyết định UX riêng |

Đã hoàn tất QA và sửa các lỗi xác nhận trong phạm vi trên. Không bắt đầu module mới. Các mục thủ công này cần được hoàn thành trước khi coi trải nghiệm trên mọi thiết bị hay production đã được xác nhận.

## 10. Bằng chứng và tái chạy

`qa/browser-evidence.json` chứa các assertion lịch sử trước/sau sửa, 50 fixture render, số đo responsive và kết quả Challenge. Các bản ghi thất bại lịch sử có classification phân biệt lỗi harness với lỗi sản phẩm đã sửa; không phải 132 assertion đều đạt ngay từ lần đầu. Log lệnh cuối lưu trong thư mục QA tại môi trường bàn giao (log không được Git track theo quy tắc ignore hiện có).

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build:static
pnpm build
pnpm dev:static
```

Không chạy `db:push`/migration hoặc publish chỉ để tái kiểm tra Note Reading. Basic frontend không cần database, tài khoản hay secret.
