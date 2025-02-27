"use client";

import { LinkSurveyWrapper } from "@/app/s/[surveyId]/components/link-survey-wrapper";
import { SurveyLinkUsed } from "@/app/s/[surveyId]/components/survey-link-used";
import { VerifyEmail } from "@/app/s/[surveyId]/components/verify-email";
import { getPrefillValue } from "@/app/s/[surveyId]/lib/prefilling";
import { SurveyInline } from "@/modules/ui/components/survey";
import { useTranslate } from "@tolgee/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FormbricksAPI } from "@formbricks/api";
import { ResponseQueue } from "@formbricks/lib/responseQueue";
import { SurveyState } from "@formbricks/lib/surveyState";
import { TJsFileUploadParams } from "@formbricks/types/js";
import { TProject } from "@formbricks/types/project";
import {
  TResponse,
  TResponseData,
  TResponseHiddenFieldValue,
  TResponseUpdate,
} from "@formbricks/types/responses";
import { TUploadFileConfig } from "@formbricks/types/storage";
import { TSurvey } from "@formbricks/types/surveys/types";

let setIsError = (_: boolean) => {};
let setIsResponseSendingFinished = (_: boolean) => {};
let setQuestionId = (_: string) => {};
let setResponseData = (_: TResponseData) => {};

interface LinkSurveyProps {
  survey: TSurvey;
  project: TProject;
  emailVerificationStatus?: string;
  singleUseId?: string;
  singleUseResponse?: TResponse;
  webAppUrl: string;
  responseCount?: number;
  verifiedEmail?: string;
  languageCode: string;
  isEmbed: boolean;
  IMPRINT_URL?: string;
  PRIVACY_URL?: string;
  IS_FORMBRICKS_CLOUD: boolean;
  locale: string;
  isPreview: boolean;
}

export const LinkSurvey = ({
  survey,
  project,
  emailVerificationStatus,
  singleUseId,
  singleUseResponse,
  webAppUrl,
  responseCount,
  verifiedEmail,
  languageCode,
  isEmbed,
  IMPRINT_URL,
  PRIVACY_URL,
  IS_FORMBRICKS_CLOUD,
  locale,
  isPreview,
}: LinkSurveyProps) => {
  const { t } = useTranslate();
  const responseId = singleUseResponse?.id;
  const searchParams = useSearchParams();
  const skipPrefilled = searchParams.get("skipPrefilled") === "true";
  const sourceParam = searchParams.get("source");
  const suId = searchParams.get("suId");
  const defaultLanguageCode = survey.languages.find((surveyLanguage) => {
    return surveyLanguage.default;
  })?.language.code;

  const startAt = searchParams.get("startAt");
  const isStartAtValid = useMemo(() => {
    if (!startAt) return false;
    if (survey.welcomeCard.enabled && startAt === "start") return true;

    const isValid = survey.questions.some((question) => question.id === startAt);

    // To remove startAt query param from URL if it is not valid:
    if (!isValid && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("startAt");
      window.history.replaceState({}, "", url.toString());
    }

    return isValid;
  }, [survey, startAt]);

  // pass in the responseId if the survey is a single use survey, ensures survey state is updated with the responseId
  let surveyState = useMemo(() => {
    return new SurveyState(survey.id, singleUseId, responseId);
  }, [survey.id, singleUseId, responseId]);

  const prefillValue = getPrefillValue(survey, searchParams, languageCode);

  const responseQueue = useMemo(
    () =>
      new ResponseQueue(
        {
          apiHost: webAppUrl,
          environmentId: survey.environmentId,
          retryAttempts: 2,
          onResponseSendingFailed: () => {
            setIsError(true);
          },
          onResponseSendingFinished: () => {
            // when response of current question is processed successfully
            setIsResponseSendingFinished(true);
          },
        },
        surveyState
      ),
    [webAppUrl, survey.environmentId, surveyState]
  );
  const [autoFocus, setAutofocus] = useState(false);
  const hasFinishedSingleUseResponse = useMemo(() => {
    if (singleUseResponse?.finished) {
      return true;
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once
  }, []);

  // Not in an iframe, enable autofocus on input fields.
  useEffect(() => {
    if (window.self === window.top) {
      setAutofocus(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once
  }, []);

  const hiddenFieldsRecord = useMemo<TResponseHiddenFieldValue>(() => {
    const fieldsRecord: TResponseHiddenFieldValue = {};

    survey.hiddenFields.fieldIds?.forEach((field) => {
      const answer = searchParams.get(field);
      if (answer) {
        fieldsRecord[field] = answer;
      }
    });

    return fieldsRecord;
  }, [searchParams, survey.hiddenFields.fieldIds]);

  const getVerifiedEmail = useMemo<Record<string, string> | null>(() => {
    if (survey.isVerifyEmailEnabled && verifiedEmail) {
      return { verifiedEmail: verifiedEmail };
    } else {
      return null;
    }
  }, [survey.isVerifyEmailEnabled, verifiedEmail]);

  useEffect(() => {
    responseQueue.updateSurveyState(surveyState);
  }, [responseQueue, surveyState]);

  if (!surveyState.isResponseFinished() && hasFinishedSingleUseResponse) {
    return <SurveyLinkUsed singleUseMessage={survey.singleUse} />;
  }

  if (survey.isVerifyEmailEnabled && emailVerificationStatus !== "verified") {
    if (emailVerificationStatus === "fishy") {
      return (
        <VerifyEmail
          survey={survey}
          isErrorComponent={true}
          languageCode={languageCode}
          styling={project.styling}
          locale={locale}
        />
      );
    }
    //emailVerificationStatus === "not-verified"
    return (
      <VerifyEmail
        singleUseId={suId ?? ""}
        survey={survey}
        languageCode={languageCode}
        styling={project.styling}
        locale={locale}
      />
    );
  }

  const determineStyling = () => {
    // Check if style overwrite is disabled at the project level
    if (!project.styling.allowStyleOverwrite) {
      return project.styling;
    }

    // Return survey styling if survey overwrites are enabled, otherwise return project styling
    return survey.styling?.overwriteThemeStyling ? survey.styling : project.styling;
  };

  const handleResetSurvey = () => {
    setQuestionId(survey.welcomeCard.enabled ? "start" : survey.questions[0].id);
    setResponseData({});
  };

  return (
    <LinkSurveyWrapper
      project={project}
      survey={survey}
      isPreview={isPreview}
      handleResetSurvey={handleResetSurvey}
      determineStyling={determineStyling}
      isEmbed={isEmbed}
      webAppUrl={webAppUrl}
      IS_FORMBRICKS_CLOUD={IS_FORMBRICKS_CLOUD}
      IMPRINT_URL={IMPRINT_URL}
      PRIVACY_URL={PRIVACY_URL}
      isBrandingEnabled={project.linkSurveyBranding}>
      <SurveyInline
        survey={survey}
        styling={determineStyling()}
        languageCode={languageCode}
        isBrandingEnabled={project.linkSurveyBranding}
        shouldResetQuestionId={false}
        getSetIsError={(f: (value: boolean) => void) => {
          setIsError = f;
        }}
        getSetIsResponseSendingFinished={
          !isPreview
            ? (f: (value: boolean) => void) => {
                setIsResponseSendingFinished = f;
              }
            : undefined
        }
        onRetry={() => {
          setIsError(false);
          void responseQueue.processQueue();
        }}
        onDisplay={() => {
          if (!isPreview) {
            void (async () => {
              const api = new FormbricksAPI({
                apiHost: webAppUrl,
                environmentId: survey.environmentId,
              });

              const res = await api.client.display.create({
                surveyId: survey.id,
              });

              if (!res.ok) {
                throw new Error(t("s.could_not_create_display"));
              }

              const { id } = res.data;

              surveyState.updateDisplayId(id);
              responseQueue.updateSurveyState(surveyState);
            })();
          }
        }}
        onResponse={(responseUpdate: TResponseUpdate) => {
          !isPreview &&
            responseQueue.add({
              data: {
                ...responseUpdate.data,
                ...hiddenFieldsRecord,
                ...getVerifiedEmail,
              },
              ttc: responseUpdate.ttc,
              finished: responseUpdate.finished,
              endingId: responseUpdate.endingId,
              language:
                responseUpdate.language === "default" && defaultLanguageCode
                  ? defaultLanguageCode
                  : responseUpdate.language,
              meta: {
                url: window.location.href,
                source: typeof sourceParam === "string" ? sourceParam : "",
              },
              variables: responseUpdate.variables,
              displayId: surveyState.displayId,
              ...(Object.keys(hiddenFieldsRecord).length > 0 && { hiddenFields: hiddenFieldsRecord }),
            });
        }}
        onFileUpload={async (file: TJsFileUploadParams["file"], params: TUploadFileConfig) => {
          const api = new FormbricksAPI({
            apiHost: webAppUrl,
            environmentId: survey.environmentId,
          });

          const uploadedUrl = await api.client.storage.uploadFile(file, params);
          return uploadedUrl;
        }}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- need it as focus behaviour is different in normal surveys and survey preview
        autoFocus={autoFocus}
        prefillResponseData={prefillValue}
        skipPrefilled={skipPrefilled}
        responseCount={responseCount}
        getSetQuestionId={(f: (value: string) => void) => {
          setQuestionId = f;
        }}
        getSetResponseData={(f: (value: TResponseData) => void) => {
          setResponseData = f;
        }}
        startAtQuestionId={startAt && isStartAtValid ? startAt : undefined}
        fullSizeCards={isEmbed}
        hiddenFieldsRecord={hiddenFieldsRecord}
      />
    </LinkSurveyWrapper>
  );
};
