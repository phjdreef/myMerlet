import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  fallbackLng: "nl",
  lng: "nl",
  resources: {
    nl: {
      translation: {
        appName: "myMerlet",
        titleHomePage: "Startpagina",
        titleSecondPage: "Tweede Pagina",
        studentDirectory: "Leerlingoverzicht",
        refreshFromAPI: "Vernieuwen vanuit API",
        downloadAllPhotos: "Alle foto's downloaden",
        allClasses: "Alle klassen",
        studentsNotSeated: "Leerlingen nog niet geplaatst",
        classroomLayout: "Klaslokaal Indeling",
        dragToSeat: "Sleep om te plaatsen in klaslokaal",
        dragToMove: "Sleep om plaats te verplaatsen",
        selectClass: "Selecteer een klas om de klasindeling te bekijken.",
        downloadingPhotos: "📸 Foto's downloaden...",
        downloadedPhotos: "📸 Gedownload {{count}}/{{total}} foto's...",
        photoDownloadComplete:
          "✅ Foto's downloaden voltooid! Gelukt: {{success}}, Mislukt: {{failed}}",
        noStudentsLoaded:
          "Geen leerlingen geladen. Vernieuw eerst vanuit de API.",
        failedToDownloadPhotos: "Foto's downloaden mislukt",
        authSuccessRetrying:
          "✅ Authenticatie succesvol! Opnieuw proberen foto's te downloaden...",
      },
    },
    en: {
      translation: {
        appName: "myMerlet",
        titleHomePage: "Home Page",
        titleSecondPage: "Second Page",
        studentDirectory: "Student Directory",
        refreshFromAPI: "Refresh from API",
        downloadAllPhotos: "Download All Photos",
        allClasses: "All Classes",
        studentsNotSeated: "Students not yet seated",
        classroomLayout: "Classroom Layout",
        dragToSeat: "Drag to seat in classroom",
        dragToMove: "Drag to move seat",
        selectClass: "Please select a class to view the classroom layout.",
        downloadingPhotos: "📸 Downloading photos...",
        downloadedPhotos: "📸 Downloaded {{count}}/{{total}} photos...",
        photoDownloadComplete:
          "✅ Photo download complete! Success: {{success}}, Failed: {{failed}}",
        noStudentsLoaded: "No students loaded. Please refresh from API first.",
        failedToDownloadPhotos: "Failed to download photos",
        authSuccessRetrying:
          "✅ Authentication successful! Retrying photo download...",
      },
    },
    "pt-BR": {
      translation: {
        appName: "myMerlet",
        titleHomePage: "Página Inicial",
        titleSecondPage: "Segunda Página",
        studentDirectory: "Diretório de Alunos",
        refreshFromAPI: "Atualizar da API",
        downloadAllPhotos: "Baixar todas as fotos",
        allClasses: "Todas as turmas",
        studentsNotSeated: "Alunos ainda não sentados",
        classroomLayout: "Layout da Sala de Aula",
        dragToSeat: "Arraste para sentar na sala de aula",
        dragToMove: "Arraste para mover o assento",
        selectClass:
          "Por favor, selecione uma turma para ver o layout da sala de aula.",
        downloadingPhotos: "📸 Baixando fotos...",
        downloadedPhotos: "📸 Baixadas {{count}}/{{total}} fotos...",
        photoDownloadComplete:
          "✅ Download de fotos concluído! Sucesso: {{success}}, Falhou: {{failed}}",
        noStudentsLoaded:
          "Nenhum aluno carregado. Por favor, atualize da API primeiro.",
        failedToDownloadPhotos: "Falha ao baixar fotos",
        authSuccessRetrying:
          "✅ Autenticação bem-sucedida! Tentando baixar fotos novamente...",
      },
    },
  },
});
