package com.hs.keycloak.auth;

import java.util.List;
import java.util.regex.Pattern;

import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.authenticators.browser.UsernamePasswordForm;
import org.keycloak.events.Details;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.ModelDuplicateException;
import org.keycloak.models.UserModel;
import org.keycloak.models.utils.KeycloakModelUtils;
import org.keycloak.services.managers.AuthenticationManager;

import jakarta.ws.rs.core.MultivaluedMap;

public class PhoneUsernamePasswordForm extends UsernamePasswordForm {

    private static final String PHONE_ATTRIBUTE = "phoneNumber";
    private static final Pattern VIETNAMESE_MOBILE =
            Pattern.compile("^0(?:3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$");

    public PhoneUsernamePasswordForm(KeycloakSession session) {
        super(session);
    }

    @Override
    protected boolean validateForm(AuthenticationFlowContext context, MultivaluedMap<String, String> formData) {
        String identifier = formData.getFirst(AuthenticationManager.FORM_USERNAME);
        if (identifier == null || isUserAlreadySetBeforeUsernamePasswordAuth(context)) {
            return super.validateForm(context, formData);
        }

        identifier = identifier.trim();
        if (VIETNAMESE_MOBILE.matcher(identifier).matches()) {
            List<UserModel> matches = context.getSession().users()
                    .searchForUserByUserAttributeStream(context.getRealm(), PHONE_ATTRIBUTE, identifier)
                    .limit(2)
                    .toList();

            if (matches.size() == 1) {
                // Let Keycloak validate credentials as a normal login so failures keep the username field.
                UserModel user = matches.getFirst();
                String login = keycloakLoginFor(context, user);
                if (login == null) {
                    context.clearUser();
                    context.getEvent().detail(Details.USERNAME, identifier);
                    context.getAuthenticationSession().setAuthNote(ATTEMPTED_USERNAME, identifier);
                    testInvalidUser(context, null);
                    return false;
                }
                identifier = login;
            }
        }

        formData.putSingle(AuthenticationManager.FORM_USERNAME, identifier);
        return super.validateForm(context, formData);
    }

    private String keycloakLoginFor(AuthenticationFlowContext context, UserModel user) {
        String username = user.getUsername();
        if (resolvesToUser(context, username, user)) {
            return username;
        }
        // Keycloak checks email first for identifiers containing '@'. Legacy usernames can collide with email addresses.
        String email = user.getEmail();
        return email != null && resolvesToUser(context, email, user) ? email : null;
    }

    private boolean resolvesToUser(AuthenticationFlowContext context, String login, UserModel user) {
        try {
            UserModel resolved = KeycloakModelUtils.findUserByNameOrEmail(context.getSession(), context.getRealm(), login);
            return resolved != null && user.getId().equals(resolved.getId());
        } catch (ModelDuplicateException ignored) {
            return false;
        }
    }
}
