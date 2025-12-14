# Supabase Edge Functions

Edge Functions ini digunakan untuk operasi yang memerlukan Supabase Service Role Key (admin operations).

## Functions

### 1. `create-user`
Membuat user baru dengan auth dan profile.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "AM"
}
```

### 2. `delete-user`
Menghapus user (auth dan profile).

**Request Body:**
```json
{
  "userId": "uuid-of-user"
}
```

### 3. `update-user` 🆕
Update user (email dan/atau password).

**Request Body:**
```json
{
  "userId": "uuid-of-user",
  "email": "newemail@example.com",
  "password": "newpassword123"
}
```

**Notes:**
- Email dan password keduanya optional
- Password minimal 6 karakter
- Membutuhkan SUPABASE_SERVICE_ROLE_KEY

### 4. `sync-google-sheets`
Sync data ke Google Sheets saat insert/update/delete data di Supabase.

**Request Body:**
```json
{
  "action": "insert",
  "table": "cctv_data",
  "data": {
    "site_id_display": "JKT001",
    "site_name": "Site Jakarta 1",
    ...
  },
  "recordId": "uuid-of-record"
}
```

**Supported Actions:**
- `insert` - Menambah row baru
- `update` - Update row berdasarkan UUID
- `delete` - Hapus row berdasarkan UUID

**Supported Tables:**

| Table | Sheet Name | Columns |
|-------|------------|---------|
| `cctv_data` | CCTV Data | No, UUID, Site ID, Site Name, Regional, Branch, Merk CCTV, Model, Install Date, Status, Tenant Available, Category, Remarks, Updated At |
| `pic_data` | PIC Data | No, UUID, Nama PIC, Jabatan, Regional, Area, NIK KTP, NIK Karyawan, NPWP, Status, Validasi, Tgl Join, Tgl Berakhir, Remark, Updated At |
| `work_trackers` | Work Tracker | No, UUID, Site ID 1, Site ID 2, Site Name, Regional, Customer, PO Number, TT Number, Suspected, Main Addwork, Status Pekerjaan, Status BAST, Submit Date, Approve Date, Aging Days, Remark, Updated At |
| `car_data` | Car Data | No, UUID, Nomor Polisi, Owner, Project, Province, Area, Kabupaten, Brand, Model, Year, STNK Exp, Pajak Exp, KIR Exp, Condition, Status Mobil, Priority, Service Info, Date Service, Remark, Updated At |

## Deployment

### Prerequisites
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login ke Supabase:
   ```bash
   supabase login
   ```

3. Link project:
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

### Deploy Functions

Deploy semua functions:
```bash
supabase functions deploy create-user
supabase functions deploy delete-user
supabase functions deploy sync-google-sheets
```

Atau deploy semua sekaligus:
```bash
supabase functions deploy
```

## Environment Variables

Edge Functions menggunakan environment variables berikut yang otomatis tersedia di Supabase:
- `SUPABASE_URL` - URL project Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin access)

### Google Sheets Sync (Tambahan untuk `sync-google-sheets`)

Environment variables ini perlu di-setup manual di Supabase Dashboard:

1. **`GOOGLE_SERVICE_ACCOUNT_EMAIL`**
   - Email dari Service Account Google Cloud
   - Contoh: `my-service-account@my-project.iam.gserviceaccount.com`

2. **`GOOGLE_PRIVATE_KEY`**
   - Private key dari file JSON credentials
   - **PENTING**: Simpan lengkap termasuk `-----BEGIN PRIVATE KEY-----` dan `-----END PRIVATE KEY-----`

3. **`GOOGLE_SPREADSHEET_ID`**
   - ID dari Google Spreadsheet
   - Ambil dari URL: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`
   - Untuk project ini: `1VLYXqp8NzdXTN9tscUP5XMRVopP_l8ghdvXTLcW_bmY`

### Cara Setup Environment Variables di Supabase:

**Via Supabase Dashboard:**
1. Buka [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda
3. Pergi ke **Settings** → **Edge Functions**
4. Scroll ke bagian **Secrets**
5. Tambahkan secrets baru untuk setiap variable di atas

**Via CLI:**
```bash
supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL="xxx@xxx.iam.gserviceaccount.com"
supabase secrets set GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
supabase secrets set GOOGLE_SPREADSHEET_ID="1VLYXqp8NzdXTN9tscUP5XMRVopP_l8ghdvXTLcW_bmY"
```

## Google Sheets Setup

### 1. Buat Google Cloud Project
1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang ada
3. Enable **Google Sheets API**:
   - APIs & Services → Library → Cari "Google Sheets API" → Enable

### 2. Buat Service Account
1. APIs & Services → Credentials → Create Credentials → Service Account
2. Beri nama, lalu klik Done
3. Klik service account yang baru dibuat
4. Tab **Keys** → Add Key → Create New Key → **JSON**
5. Download dan simpan file JSON dengan aman

### 3. Setup Google Spreadsheet
1. Buat spreadsheet baru atau gunakan yang ada: `1VLYXqp8NzdXTN9tscUP5XMRVopP_l8ghdvXTLcW_bmY`
2. **Buat 4 sheet tabs** dengan nama persis:
   - `CCTV Data`
   - `PIC Data`
   - `Work Tracker`
   - `Car Data`
3. Buat header di row 1 untuk setiap sheet (lihat tabel di atas untuk urutan kolom)
4. **Share spreadsheet** ke email service account (dari file JSON, field `client_email`)
   - Klik Share → Masukkan email service account → Pilih **Editor**

## Fallback Behavior

Jika Edge Functions belum di-deploy, aplikasi akan menggunakan fallback:
- **Create User**: Menggunakan `signUp()` - user perlu verifikasi email
- **Delete User**: Hanya menghapus profile dari database (auth user tetap ada)
- **Google Sheets Sync**: Data tetap tersimpan di Supabase, hanya sync yang gagal (non-blocking)

## Troubleshooting

### General
Jika mendapat error saat invoke:
1. Pastikan Edge Functions sudah di-deploy
2. Periksa CORS settings di project Supabase
3. Cek logs: `supabase functions logs <function-name>`

### Google Sheets Sync
1. **"Google Service Account credentials not configured"**
   - Pastikan environment variables sudah di-set di Supabase Dashboard

2. **"Failed to get Google access token"**
   - Periksa apakah private key valid dan tidak ada karakter yang hilang
   - Pastikan format private key benar (termasuk newlines)

3. **Data tidak muncul di Google Sheets**
   - Pastikan sheet tab bernama **`CCTV Data`** (case-sensitive)
   - Pastikan spreadsheet di-share ke email service account dengan akses **Editor**
   - Cek logs: `supabase functions logs sync-google-sheets`

4. **Permission denied**
   - Pastikan Google Sheets API sudah di-enable di Google Cloud Console
   - Pastikan service account memiliki akses ke spreadsheet

