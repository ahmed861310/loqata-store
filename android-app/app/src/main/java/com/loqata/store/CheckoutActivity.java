package com.loqata.store;

import android.content.*;
import android.net.Uri;
import android.os.Bundle;
import android.view.*;
import android.widget.*;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.textfield.TextInputEditText;
import com.google.gson.JsonObject;
import com.loqata.store.model.ShippingSettings;
import java.util.*;

public class CheckoutActivity extends AppCompatActivity {
    private final ApiClient api = new ApiClient();
    private CartStore cart;
    private TextInputEditText name, phone, address;
    private Spinner shipping;
    private ProgressBar progress;
    private Button requestOtp;
    private TextView total;
    private ShippingSettings settings;
    private List<ShippingSettings.Zone> zones = new ArrayList<>();
    private boolean otpRequestInFlight = false;
    private boolean orderInFlight = false;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_checkout);
        getWindow().getDecorView().setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        cart = new CartStore(this);
        name = findViewById(R.id.nameInput);
        phone = findViewById(R.id.phoneInput);
        address = findViewById(R.id.addressInput);
        shipping = findViewById(R.id.shippingSpinner);
        progress = findViewById(R.id.checkoutProgress);
        requestOtp = findViewById(R.id.requestOtpButton);
        total = findViewById(R.id.checkoutTotal);

        SharedPreferences profile = getSharedPreferences("loqata_profile", MODE_PRIVATE);
        name.setText(profile.getString("name", ""));
        phone.setText(profile.getString("phone", ""));
        address.setText(profile.getString("address", ""));

        requestOtp.setEnabled(false);
        requestOtp.setOnClickListener(v -> beginOtp());
        loadShipping();
    }

    private void loadShipping() {
        busy(true);
        api.shipping(new ApiClient.Result<>() {
            public void ok(ShippingSettings value) {
                runOnUiThread(() -> {
                    busy(false);
                    settings = value;
                    zones = value != null && value.zones != null ? value.zones : new ArrayList<>();
                    ArrayAdapter<ShippingSettings.Zone> a = new ArrayAdapter<>(
                            CheckoutActivity.this, android.R.layout.simple_spinner_dropdown_item, zones);
                    shipping.setAdapter(a);
                    requestOtp.setEnabled(!zones.isEmpty());
                    total.setText("سيتم حساب الإجمالي النهائي من السيرفر عند إنشاء الطلب.");
                });
            }
            public void error(String message) {
                runOnUiThread(() -> {
                    busy(false);
                    Toast.makeText(CheckoutActivity.this, message, Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private String text(TextInputEditText v) {
        return v.getText() == null ? "" : v.getText().toString().trim();
    }

    private boolean validate() {
        if (text(name).isEmpty()) { name.setError("الاسم مطلوب"); return false; }
        if (!text(phone).matches("^01\\d{9}$")) { phone.setError("رقم الهاتف يجب أن يكون 11 رقمًا"); return false; }
        if (text(address).length() < 5) { address.setError("اكتب عنوانًا واضحًا"); return false; }
        if (zones.isEmpty() || shipping.getSelectedItemPosition() < 0) {
            Toast.makeText(this, "اختر منطقة التوصيل", Toast.LENGTH_SHORT).show();
            return false;
        }
        return true;
    }

    private void saveProfile() {
        getSharedPreferences("loqata_profile", MODE_PRIVATE).edit()
                .putString("name", text(name))
                .putString("phone", text(phone))
                .putString("address", text(address))
                .apply();
    }

    private void beginOtp() {
        if (otpRequestInFlight || orderInFlight) return;
        if (!validate()) return;
        if (!NetworkState.isOnline(this)) {
            toast("لا يوجد اتصال بالإنترنت. جرّب بعد عودة الشبكة.");
            return;
        }

        saveProfile();
        otpRequestInFlight = true;
        busy(true);

        api.requestOtp(text(phone), new ApiClient.Result<>() {
            public void ok(JsonObject value) {
                runOnUiThread(() -> {
                    if (isFinishing() || isDestroyed()) return;
                    otpRequestInFlight = false;
                    busy(false);
                    String challenge = value.has("challengeId") ? value.get("challengeId").getAsString() : "";
                    if (challenge.isEmpty()) {
                        toast("لم يصل رقم تحدي OTP من السيرفر");
                        return;
                    }
                    showOtpDialog(challenge);
                });
            }

            public void error(String message) {
                runOnUiThread(() -> {
                    if (isFinishing() || isDestroyed()) return;
                    otpRequestInFlight = false;
                    busy(false);
                    toast(message);
                });
            }
        });
    }

    private void showOtpDialog(String challengeId) {
        final EditText input = new EditText(this);
        input.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        input.setHint("رمز التحقق المكوّن من 6 أرقام");
        int pad = (int)(20 * getResources().getDisplayMetrics().density);
        input.setPadding(pad, pad, pad, pad);

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("تأكيد رقم الهاتف")
                .setMessage("أدخل رمز OTP الذي وصلك على الهاتف.")
                .setView(input)
                .setNegativeButton("إلغاء", null)
                .setPositiveButton("تحقق", null)
                .create();

        dialog.setOnShowListener(x -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String code = input.getText().toString().trim();
            if (!code.matches("^\\d{6}$")) { input.setError("أدخل 6 أرقام"); return; }
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(false);
            api.verifyOtp(challengeId, text(phone), code, new ApiClient.Result<>() {
                public void ok(JsonObject value) {
                    runOnUiThread(() -> {
                        dialog.dismiss();
                        String token = value.has("verificationToken") ? value.get("verificationToken").getAsString() : "";
                        if (token.isEmpty()) { toast("تعذر تأكيد الهاتف"); return; }
                        createOrder(token);
                    });
                }
                public void error(String message) {
                    runOnUiThread(() -> {
                        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(true);
                        input.setError(message);
                    });
                }
            });
        }));
        dialog.show();
    }

    private void createOrder(String verificationToken) {
        if (orderInFlight) return;
        if (!NetworkState.isOnline(this)) {
            toast("لا يوجد اتصال بالإنترنت. لم يتم إرسال الطلب.");
            return;
        }

        ShippingSettings.Zone zone = zones.get(shipping.getSelectedItemPosition());
        orderInFlight = true;
        busy(true);

        api.createCodOrder(text(name), text(phone), text(address), zone.id,
                verificationToken, cart.items(), new ApiClient.Result<>() {
            public void ok(JsonObject order) {
                runOnUiThread(() -> {
                    if (isFinishing() || isDestroyed()) return;
                    orderInFlight = false;
                    busy(false);
                    String id = order.has("id") ? order.get("id").getAsString() : "";
                    double amount = order.has("total") ? order.get("total").getAsDouble() : 0;
                    cart.clear();
                    showSuccess(id, amount);
                });
            }

            public void error(String message) {
                runOnUiThread(() -> {
                    if (isFinishing() || isDestroyed()) return;
                    orderInFlight = false;
                    busy(false);
                    toast(message);
                });
            }
        });
    }

    private void showSuccess(String orderId, double amount) {
        String message = "تم إنشاء طلبك بنجاح\nرقم الطلب: " + orderId +
                "\nالإجمالي: " + String.format(Locale.US, "%.0f ج.م", amount);

        new AlertDialog.Builder(this)
                .setTitle("تم الطلب")
                .setMessage(message)
                .setCancelable(false)
                .setNegativeButton("العودة للمتجر", (d, w) -> finish())
                .setPositiveButton("فتح واتساب", (d, w) -> {
                    String text = "مرحبًا، تم إنشاء طلبي في لقطة.\nرقم الطلب: " + orderId +
                            "\nالإجمالي: " + String.format(Locale.US, "%.0f ج.م", amount);
                    Uri uri = Uri.parse("https://wa.me/" + BuildConfig.WHATSAPP_NUMBER +
                            "?text=" + Uri.encode(text));
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    finish();
                })
                .show();
    }

    private void busy(boolean on) {
        progress.setVisibility(on ? View.VISIBLE : View.GONE);
        requestOtp.setEnabled(!on && !zones.isEmpty());
    }

    private void toast(String s) {
        Toast.makeText(this, s, Toast.LENGTH_LONG).show();
    }
}
